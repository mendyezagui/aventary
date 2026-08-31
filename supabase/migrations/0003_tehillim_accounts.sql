-- Tehillim accounts: cross-device sync of saved Psalms + settings.
-- One row per authenticated user, keyed to Supabase Auth. A human-readable
-- handle is stored for future list-sharing (typing someone's handle to import
-- their list) — that feature is not built yet, so RLS keeps a row readable
-- only by its owner.

create table if not exists public.tehillim_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  handle     text unique not null,
  saved      jsonb not null default '[]'::jsonb,   -- [{ ch, note? }, ...] in the user's order
  settings   jsonb not null default '{}'::jsonb,   -- speed, font, theme, enhance, barOpen
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists tehillim_profiles_handle_idx on public.tehillim_profiles(handle);

alter table public.tehillim_profiles enable row level security;

drop policy if exists tehillim_profiles_own_select on public.tehillim_profiles;
create policy tehillim_profiles_own_select on public.tehillim_profiles
  for select using (auth.uid() = user_id);

drop policy if exists tehillim_profiles_own_insert on public.tehillim_profiles;
create policy tehillim_profiles_own_insert on public.tehillim_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists tehillim_profiles_own_update on public.tehillim_profiles;
create policy tehillim_profiles_own_update on public.tehillim_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists tehillim_profiles_touch on public.tehillim_profiles;
create trigger tehillim_profiles_touch before update on public.tehillim_profiles
  for each row execute function public.touch_updated_at();
