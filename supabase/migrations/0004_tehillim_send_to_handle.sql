-- Send saved Psalms to another user's handle.
--
-- Owner-only RLS (0003) keeps a profile writable only by its owner, so a
-- browser can't append to someone else's saved list directly. This
-- SECURITY DEFINER function does it in a controlled, narrow way: a signed-in
-- user names a target handle and a set of saved entries, and we append only
-- the chapters that handle doesn't already have (no duplicates by `ch`).
-- Returns true when the handle exists (something was sent), false otherwise.
--
-- Guards: caller must be signed in; the payload must be a small JSON array of
-- { ch, note? } with ch in 1..150. The function can only ever *add* chapters —
-- it never reads back or removes anything from the target's list.

create or replace function public.tehillim_add_saved_by_handle(
  target_handle text,
  add_saved     jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matched integer;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to send';
  end if;

  if jsonb_typeof(add_saved) is distinct from 'array' then
    raise exception 'add_saved must be a JSON array';
  end if;

  if jsonb_array_length(add_saved) > 20 then
    raise exception 'too many chapters to send at once';
  end if;

  update public.tehillim_profiles p
  set saved = p.saved || (
        select coalesce(jsonb_agg(e), '[]'::jsonb)
        from jsonb_array_elements(add_saved) e
        where jsonb_typeof(e->'ch') = 'number'
          and (e->>'ch')::int between 1 and 150
          and not exists (
            select 1
            from jsonb_array_elements(p.saved) x
            where (x->>'ch') = (e->>'ch')
          )
      ),
      updated_at = now()
  where p.handle = lower(btrim(target_handle));

  get diagnostics matched = row_count;
  return matched > 0;
end;
$$;

revoke all on function public.tehillim_add_saved_by_handle(text, jsonb) from public;
revoke all on function public.tehillim_add_saved_by_handle(text, jsonb) from anon;
grant execute on function public.tehillim_add_saved_by_handle(text, jsonb) to authenticated;
