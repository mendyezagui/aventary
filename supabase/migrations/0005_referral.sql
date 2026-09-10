-- Sweet referral ("your Tehillim circle"): track who shared the app with whom,
-- and how many perakim each person has said, so a person can see the Tehillim
-- their circle has said — by level, a few levels deep. No money, just nachas.
--
-- A person's referral code is simply their existing profile `handle`
-- (e.g. quiet-cedar-harp-42); the share link is /?ref=<handle>.

alter table public.tehillim_profiles
  add column if not exists referred_by  uuid references auth.users(id) on delete set null,
  add column if not exists referred_at  timestamptz,
  add column if not exists perakim_said bigint not null default 0;

create index if not exists tehillim_profiles_referred_by_idx
  on public.tehillim_profiles(referred_by);

-- Link the caller to a referrer (found by the referrer's handle). Owner-only RLS
-- blocks reading another profile, so this runs SECURITY DEFINER. Set ONCE (no
-- re-parenting), never to self, and never forming a cycle. Returns the outcome.
create or replace function public.set_referrer_by_handle(referrer_handle text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  ref_id uuid;
  cur uuid;
  depth int := 0;
begin
  if me is null then return 'unauthenticated'; end if;

  if exists (select 1 from tehillim_profiles
             where user_id = me and referred_by is not null) then
    return 'already_linked';
  end if;

  select user_id into ref_id from tehillim_profiles
    where handle = lower(btrim(referrer_handle));
  if ref_id is null then return 'not_found'; end if;
  if ref_id = me then return 'self'; end if;

  -- cycle guard: walk up from the referrer; reaching `me` would be a loop
  cur := ref_id;
  while cur is not null and depth < 50 loop
    if cur = me then return 'cycle'; end if;
    select referred_by into cur from tehillim_profiles where user_id = cur;
    depth := depth + 1;
  end loop;

  update tehillim_profiles
    set referred_by = ref_id, referred_at = now()
    where user_id = me and referred_by is null;
  return 'linked';
end;
$$;

-- Add to the caller's perakim tally (bounded per call).
create or replace function public.increment_perakim(n int)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid(); total bigint;
begin
  if me is null then return 0; end if;
  if n is null or n <= 0 or n > 200 then
    return coalesce((select perakim_said from tehillim_profiles where user_id = me), 0);
  end if;
  update tehillim_profiles set perakim_said = perakim_said + n
    where user_id = me
    returning perakim_said into total;
  return coalesce(total, 0);
end;
$$;

-- Aggregate stats for the caller's referral subtree, down to 5 levels.
-- Rows: {level 1..5, people, perakim}. Aggregate only — never identities.
create or replace function public.referral_stats()
returns table(level int, people bigint, perakim bigint)
language sql
security definer
set search_path = public
as $$
  with recursive tree as (
    select user_id, perakim_said, 1 as lvl
      from tehillim_profiles
      where referred_by = auth.uid()
    union all
    select p.user_id, p.perakim_said, t.lvl + 1
      from tehillim_profiles p
      join tree t on p.referred_by = t.user_id
      where t.lvl < 5
  )
  select lvl as level,
         count(*)::bigint as people,
         coalesce(sum(perakim_said), 0)::bigint as perakim
  from tree
  group by lvl
  order by lvl;
$$;

revoke execute on function public.set_referrer_by_handle(text) from public, anon;
revoke execute on function public.increment_perakim(int) from public, anon;
revoke execute on function public.referral_stats() from public, anon;
grant execute on function public.set_referrer_by_handle(text) to authenticated;
grant execute on function public.increment_perakim(int) to authenticated;
grant execute on function public.referral_stats() to authenticated;
