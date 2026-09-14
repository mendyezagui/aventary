-- Undo phase 1. Run against B (fukehjqikxqsntwhmgsk).
--
-- Phase 1 is insert-only, so the undo is a delete of exactly the ids it added.
-- Nothing that existed before phase 1 is touched by this script.
--
-- Safe to run twice. If phase 1 was never applied, this deletes nothing.

begin;

delete from public.tasks
 where tenant_id = '0a7225ba-7625-4881-8d8f-237424282b3b' and id between 394 and 489;

delete from public.deals
 where tenant_id = '0a7225ba-7625-4881-8d8f-237424282b3b' and id = 18;

delete from public.projects
 where tenant_id = '0a7225ba-7625-4881-8d8f-237424282b3b' and id = 10013;

delete from public.contacts
 where tenant_id = '0a7225ba-7625-4881-8d8f-237424282b3b'
   and (id between 209 and 383 or id in (385,386,387));

delete from public.companies
 where tenant_id = '0a7225ba-7625-4881-8d8f-237424282b3b'
   and (id between 136 and 171 or id = 173);

delete from public.campaigns
 where tenant_id = '0a7225ba-7625-4881-8d8f-237424282b3b' and id = 5;

-- Back to the pre-merge fingerprint. These must match ops/merge-a-into-b/00_prestate.md.
do $c$
declare n int; h text;
begin
  select count(*) into n from public.campaigns where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'; if n <> 4   then raise exception 'campaigns: expected 4, got %', n;   end if;
  select count(*) into n from public.companies where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'; if n <> 135 then raise exception 'companies: expected 135, got %', n; end if;
  select count(*) into n from public.contacts  where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'; if n <> 199 then raise exception 'contacts: expected 199, got %', n;  end if;
  select count(*) into n from public.deals     where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'; if n <> 11  then raise exception 'deals: expected 11, got %', n;     end if;
  select count(*) into n from public.projects  where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'; if n <> 18  then raise exception 'projects: expected 18, got %', n;  end if;
  select count(*) into n from public.tasks     where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'; if n <> 348 then raise exception 'tasks: expected 348, got %', n;    end if;

  select md5(coalesce(string_agg(x::text,'|' order by id),'')) into h from public.contacts x where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b';
  if h <> '0aa2efa252bc165fbd877bbb64b565c6' then raise exception 'contacts hash mismatch: %', h; end if;
  select md5(coalesce(string_agg(x::text,'|' order by id),'')) into h from public.tasks x where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b';
  if h <> '79c205522e3f3a19115aa9c7f92e0868' then raise exception 'tasks hash mismatch: %', h; end if;
end $c$;

commit;
