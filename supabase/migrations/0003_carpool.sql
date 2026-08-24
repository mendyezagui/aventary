-- Carpool — live location sharing and "we're one minute away" pings.
-- Run via: supabase db push  (or paste into the Supabase SQL editor).
--
-- Model: a GROUP is one carpool (e.g. "Bais Yaakov 8th grade — morning").
-- Every parent in it is a MEMBER. Each family has a STOP (their house).
-- When someone drives, they open a RUN; their phone writes its position to
-- CARPOOL_LOCATIONS every few seconds, and the other parents' phones read it
-- over Supabase Realtime. PINGS are the "be outside in a minute" messages.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------- groups ----------
create table if not exists public.carpool_groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  school      text,
  join_code   text unique not null,          -- short code parents type to join
  timezone    text not null default 'America/New_York',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- members (one row per parent per group) ----------
create table if not exists public.carpool_members (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references public.carpool_groups(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  phone        text,
  is_admin     boolean not null default false,   -- can edit the group and other stops
  created_at   timestamptz not null default now(),
  unique (group_id, user_id)
);
create index if not exists carpool_members_group_idx on public.carpool_members(group_id);
create index if not exists carpool_members_user_idx  on public.carpool_members(user_id);

-- ---------- stops (a family's pickup point) ----------
create table if not exists public.carpool_stops (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references public.carpool_groups(id) on delete cascade,
  member_id  uuid references public.carpool_members(id) on delete set null,
  label      text not null,                   -- "The Cohens"
  address    text,
  lat        double precision,
  lng        double precision,
  riders     text,                            -- "Chaya, Moshe"
  position   int not null default 0,          -- order along the route
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists carpool_stops_group_idx on public.carpool_stops(group_id, position);

-- ---------- runs (one drive: to school or home) ----------
create table if not exists public.carpool_runs (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references public.carpool_groups(id) on delete cascade,
  driver_id  uuid not null references public.carpool_members(id) on delete cascade,
  direction  text not null default 'to_school'
             check (direction in ('to_school', 'from_school')),
  status     text not null default 'active'
             check (status in ('active', 'done', 'canceled')),
  note       text,
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);
create index if not exists carpool_runs_group_idx on public.carpool_runs(group_id, started_at desc);
-- At most one active run per driver.
create unique index if not exists carpool_runs_one_active
  on public.carpool_runs(driver_id) where status = 'active';

-- ---------- live location (last known position, one row per member) ----------
-- Upserted by the driver's phone every few seconds. Deliberately *not* a
-- history table: keeping a breadcrumb trail of where parents drive is data
-- nobody asked for. Wipe on stop-sharing.
create table if not exists public.carpool_locations (
  member_id  uuid primary key references public.carpool_members(id) on delete cascade,
  group_id   uuid not null references public.carpool_groups(id) on delete cascade,
  run_id     uuid references public.carpool_runs(id) on delete set null,
  lat        double precision not null,
  lng        double precision not null,
  accuracy_m double precision,
  heading    double precision,
  speed_mps  double precision,
  updated_at timestamptz not null default now()
);
create index if not exists carpool_locations_group_idx on public.carpool_locations(group_id, updated_at desc);

-- ---------- pings ("be outside in a minute") ----------
create table if not exists public.carpool_pings (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references public.carpool_groups(id) on delete cascade,
  run_id     uuid references public.carpool_runs(id) on delete cascade,
  stop_id    uuid references public.carpool_stops(id) on delete cascade,
  from_member uuid references public.carpool_members(id) on delete set null,
  kind       text not null default 'one_minute'
             check (kind in ('heads_up', 'one_minute', 'arrived', 'waiting', 'skipped', 'running_late', 'message')),
  message    text,
  eta_seconds int,
  created_at timestamptz not null default now()
);
create index if not exists carpool_pings_group_idx on public.carpool_pings(group_id, created_at desc);
-- One automatic ping of each kind per stop per run, so a driver circling the
-- block doesn't buzz the same family six times.
create unique index if not exists carpool_pings_once_per_run
  on public.carpool_pings(run_id, stop_id, kind)
  where run_id is not null and stop_id is not null;

-- ---------- web push subscriptions ----------
create table if not exists public.carpool_push_subs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  failed_at  timestamptz
);
create index if not exists carpool_push_subs_user_idx on public.carpool_push_subs(user_id);

-- ---------- updated_at triggers ----------
drop trigger if exists carpool_stops_touch on public.carpool_stops;
create trigger carpool_stops_touch before update on public.carpool_stops
  for each row execute function public.touch_updated_at();

-- ---------- membership helper ----------
-- SECURITY DEFINER so the policies below can ask "is the caller in this
-- group?" without re-entering RLS on carpool_members (which would recurse).
create or replace function public.carpool_is_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.carpool_members m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

create or replace function public.carpool_is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.carpool_members m
    where m.group_id = gid and m.user_id = auth.uid() and m.is_admin
  );
$$;

-- My member id inside a group (used by with-check clauses).
create or replace function public.carpool_member_id(gid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select m.id from public.carpool_members m
  where m.group_id = gid and m.user_id = auth.uid()
  limit 1;
$$;

-- ---------- RLS ----------
alter table public.carpool_groups    enable row level security;
alter table public.carpool_members   enable row level security;
alter table public.carpool_stops     enable row level security;
alter table public.carpool_runs      enable row level security;
alter table public.carpool_locations enable row level security;
alter table public.carpool_pings     enable row level security;
alter table public.carpool_push_subs enable row level security;

-- groups: members read; admins update. Creation goes through the RPC below.
drop policy if exists "carpool read own groups" on public.carpool_groups;
create policy "carpool read own groups" on public.carpool_groups
  for select using (public.carpool_is_member(id));

drop policy if exists "carpool admin updates group" on public.carpool_groups;
create policy "carpool admin updates group" on public.carpool_groups
  for update using (public.carpool_is_group_admin(id))
  with check (public.carpool_is_group_admin(id));

-- members: everyone in the group sees the roster; you edit only your own row
-- (or any row if you're the group admin).
drop policy if exists "carpool read roster" on public.carpool_members;
create policy "carpool read roster" on public.carpool_members
  for select using (public.carpool_is_member(group_id));

drop policy if exists "carpool edit own member row" on public.carpool_members;
create policy "carpool edit own member row" on public.carpool_members
  for update using (user_id = auth.uid() or public.carpool_is_group_admin(group_id))
  with check (user_id = auth.uid() or public.carpool_is_group_admin(group_id));

drop policy if exists "carpool leave group" on public.carpool_members;
create policy "carpool leave group" on public.carpool_members
  for delete using (user_id = auth.uid() or public.carpool_is_group_admin(group_id));

-- stops: the whole group reads them (that's the point — the driver needs the
-- addresses). You write your own; admins write any.
drop policy if exists "carpool read stops" on public.carpool_stops;
create policy "carpool read stops" on public.carpool_stops
  for select using (public.carpool_is_member(group_id));

drop policy if exists "carpool insert own stop" on public.carpool_stops;
create policy "carpool insert own stop" on public.carpool_stops
  for insert with check (
    public.carpool_is_member(group_id)
    and (member_id = public.carpool_member_id(group_id) or public.carpool_is_group_admin(group_id))
  );

drop policy if exists "carpool update own stop" on public.carpool_stops;
create policy "carpool update own stop" on public.carpool_stops
  for update using (
    member_id = public.carpool_member_id(group_id) or public.carpool_is_group_admin(group_id)
  ) with check (
    member_id = public.carpool_member_id(group_id) or public.carpool_is_group_admin(group_id)
  );

drop policy if exists "carpool delete own stop" on public.carpool_stops;
create policy "carpool delete own stop" on public.carpool_stops
  for delete using (
    member_id = public.carpool_member_id(group_id) or public.carpool_is_group_admin(group_id)
  );

-- runs: group reads; you open/close your own.
drop policy if exists "carpool read runs" on public.carpool_runs;
create policy "carpool read runs" on public.carpool_runs
  for select using (public.carpool_is_member(group_id));

drop policy if exists "carpool start own run" on public.carpool_runs;
create policy "carpool start own run" on public.carpool_runs
  for insert with check (driver_id = public.carpool_member_id(group_id));

drop policy if exists "carpool end own run" on public.carpool_runs;
create policy "carpool end own run" on public.carpool_runs
  for update using (driver_id = public.carpool_member_id(group_id))
  with check (driver_id = public.carpool_member_id(group_id));

-- locations: the group sees where everyone is; you only ever write your own.
drop policy if exists "carpool read locations" on public.carpool_locations;
create policy "carpool read locations" on public.carpool_locations
  for select using (public.carpool_is_member(group_id));

drop policy if exists "carpool write own location" on public.carpool_locations;
create policy "carpool write own location" on public.carpool_locations
  for insert with check (member_id = public.carpool_member_id(group_id));

drop policy if exists "carpool update own location" on public.carpool_locations;
create policy "carpool update own location" on public.carpool_locations
  for update using (member_id = public.carpool_member_id(group_id))
  with check (member_id = public.carpool_member_id(group_id));

-- Stopping sharing deletes the row outright.
drop policy if exists "carpool clear own location" on public.carpool_locations;
create policy "carpool clear own location" on public.carpool_locations
  for delete using (member_id = public.carpool_member_id(group_id));

-- pings: group reads; any member can send one into their own group.
drop policy if exists "carpool read pings" on public.carpool_pings;
create policy "carpool read pings" on public.carpool_pings
  for select using (public.carpool_is_member(group_id));

drop policy if exists "carpool send ping" on public.carpool_pings;
create policy "carpool send ping" on public.carpool_pings
  for insert with check (from_member = public.carpool_member_id(group_id));

-- push subscriptions: strictly your own.
drop policy if exists "carpool own push subs" on public.carpool_push_subs;
create policy "carpool own push subs" on public.carpool_push_subs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- create / join by code ----------
-- Both run as SECURITY DEFINER because a parent joining by code has, by
-- definition, no membership yet — so no policy could let them read the group.

create or replace function public.carpool_new_code()
returns text language sql volatile as $$
  -- 6 characters, no vowels and no 0/O/1/I — codes get read aloud on the phone.
  select string_agg(substr('BCDFGHJKLMNPQRSTVWXZ23456789',
                           1 + floor(random() * 28)::int, 1), '')
  from generate_series(1, 6);
$$;

create or replace function public.carpool_create_group(
  p_name text,
  p_school text default null,
  p_display_name text default null,
  p_timezone text default 'America/New_York'
) returns public.carpool_groups
language plpgsql volatile security definer set search_path = public as $$
declare
  g public.carpool_groups;
  code text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  loop
    code := public.carpool_new_code();
    exit when not exists (select 1 from public.carpool_groups x where x.join_code = code);
  end loop;

  insert into public.carpool_groups (name, school, join_code, timezone, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Carpool'), nullif(trim(p_school), ''),
          code, coalesce(p_timezone, 'America/New_York'), auth.uid())
  returning * into g;

  insert into public.carpool_members (group_id, user_id, display_name, is_admin)
  values (g.id, auth.uid(),
          coalesce(nullif(trim(p_display_name), ''), split_part(auth.jwt() ->> 'email', '@', 1)),
          true);

  return g;
end $$;

create or replace function public.carpool_join_group(
  p_code text,
  p_display_name text default null
) returns public.carpool_groups
language plpgsql volatile security definer set search_path = public as $$
declare
  g public.carpool_groups;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into g from public.carpool_groups
  where join_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if g.id is null then
    raise exception 'no carpool with that code';
  end if;

  insert into public.carpool_members (group_id, user_id, display_name)
  values (g.id, auth.uid(),
          coalesce(nullif(trim(p_display_name), ''), split_part(auth.jwt() ->> 'email', '@', 1)))
  on conflict (group_id, user_id) do update set display_name = excluded.display_name;

  return g;
end $$;

revoke all on function public.carpool_create_group(text, text, text, text) from public;
revoke all on function public.carpool_join_group(text, text) from public;
grant execute on function public.carpool_create_group(text, text, text, text) to authenticated;
grant execute on function public.carpool_join_group(text, text) to authenticated;

-- ---------- realtime ----------
-- The client subscribes to these three; everything else is fetched on load.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.carpool_locations';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.carpool_pings';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.carpool_runs';
    exception when duplicate_object then null; end;
  end if;
end $$;

-- Realtime sends old-record data on delete only with a replica identity.
alter table public.carpool_locations replica identity full;
