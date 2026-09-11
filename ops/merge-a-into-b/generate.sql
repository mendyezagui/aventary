-- Second Brain merge, phase 1 of N — generate the B-side migration.
--
-- RUN THIS ON A (xwacfwagyhgbbhefecdt). It writes no data. It returns one text
-- column containing a complete, ready-to-run SQL transaction for B
-- (fukehjqikxqsntwhmgsk), with every id and foreign key already remapped.
--
-- Phase 1 covers the seven core CRM tables audited in docs/second-brain-merge-audit.md:
-- campaigns, companies, contacts, projects, deals, tasks (strategies and goals are
-- already identical on both sides and are not touched). 313 rows.
--
-- It does NOT make A disposable. See "What phase 1 does not cover" in the audit.
--
-- Id map (A -> B). Anything not listed keeps its id, because that id is free in B.
--   companies  135 Actum Processing      -> 173   (135 is Prime Rock Realty in B)
--   companies  172 Prime Rock Realty     -> DROP  (already B 135)
--   contacts   206 Mendy Ezagui          -> 385   (206 is Luke Swanek in B)
--   contacts   207 Miki                  -> 386   (207 is Amrita Sekhar in B)
--   contacts   208 Alex Gertel           -> 387   (208 is Micah Hiller in B)
--   contacts   384 Micah Hiller          -> DROP  (already B 208)
--   projects 10010 Cheder Menachem       -> 10013 (10010 is Rambam in B)
--   projects 10011 Prime Rock Realty     -> DROP  (already B 10012)
--
-- Columns dropped on the way across, verified empty on every moving row:
--   projects.files  ([] on 10010)   tasks.reschedule_count  (0/null on 394-489)

-- No psql meta-commands: this has to run through the Supabase SQL connector too.
with
-- Id maps, evaluated on the A side so the emitted literals are already B-side ids.
cmap as (
  select id a, (case id when 135 then 173 when 172 then 135 else id end) b from companies
),
ctmap as (
  select id a, (case id when 206 then 385 when 207 then 386 when 208 then 387
                        when 384 then 208 else id end) b from contacts
),
pmap as (
  select id a, (case id when 10010 then 10013 when 10011 then 10012 else id end) b from projects
),

-- ---------- campaigns (1 row: id 5) -----------------------------------------
s_campaigns as (
  select string_agg(format(
    'insert into public.campaigns (tenant_id,id,name,type,channel,status,"startDate",budget,spend,leads,opens,conversions,notes,modified_by,modified_at) values (%L,%s,%L,%L,%L,%L,%L,%s,%s,%s,%s,%s,%L,%L,%L);',
    '0a7225ba-7625-4881-8d8f-237424282b3b', id, name, type, channel, status, "startDate",
    coalesce(budget::text,'null'), coalesce(spend::text,'null'), coalesce(leads::text,'null'),
    coalesce(opens::text,'null'), coalesce(conversions::text,'null'),
    notes, modified_by, modified_at), E'\n' order by id) t
  from campaigns where id = 5
),

-- ---------- companies (ids 135-171; 172 deduped away) ------------------------
s_companies as (
  select string_agg(format(
    'insert into public.companies (tenant_id,id,name,industry,website,linkedin_url,news_keywords,status,notes,created_at,modified_by,modified_at) values (%L,%s,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
    '0a7225ba-7625-4881-8d8f-237424282b3b', (select b from cmap where a = c.id), c.name, c.industry, c.website, c.linkedin_url,
    c.news_keywords, c.status, c.notes, c.created_at, c.modified_by, c.modified_at), E'\n' order by c.id) t
  from companies c where c.id between 135 and 171
),

-- ---------- contacts (ids 206-383; 384 deduped away) -------------------------
s_contacts as (
  select string_agg(format(
    'insert into public.contacts (tenant_id,id,name,co,role,email,phone,status,score,tags,"lastTouch",notes,linkedin_url,headline,connected_date,messaging_activity,priority,follow_up,"companyId",category,source,"referredBy","campaignId",modified_by,modified_at) values (%L,%s,%L,%L,%L,%L,%L,%L,%s,%L::text[],%L,%L,%L,%L,%L,%L,%L,%L,%s,%L,%L,%s,%s,%L,%L);',
    '0a7225ba-7625-4881-8d8f-237424282b3b', (select b from ctmap where a = ct.id), ct.name, ct.co, ct.role, ct.email, ct.phone,
    ct.status, coalesce(ct.score::text,'null'), coalesce(ct.tags::text,'{}'), ct."lastTouch", ct.notes,
    ct.linkedin_url, ct.headline, ct.connected_date, ct.messaging_activity, ct.priority, ct.follow_up,
    coalesce((select b from cmap where a = ct."companyId")::text,'null'),
    ct.category, ct.source,
    coalesce((select b from ctmap where a = ct."referredBy")::text,'null'),
    coalesce(ct."campaignId"::text,'null'),
    ct.modified_by, ct.modified_at), E'\n' order by ct.id) t
  from contacts ct where ct.id between 206 and 383
),

-- ---------- projects (id 10010 -> 10013; 10011 deduped away) -----------------
s_projects as (
  select string_agg(format(
    'insert into public.projects (tenant_id,id,name,client,type,"companyId",status,progress,"dueDate",priority,notes,"strategyId",links,modified_by,modified_at) values (%L,%s,%L,%L,%L,%s,%L,%s,%L,%L,%L,%s,%L::jsonb,%L,%L);',
    '0a7225ba-7625-4881-8d8f-237424282b3b', (select b from pmap where a = p.id), p.name, p.client, p.type,
    coalesce((select b from cmap where a = p."companyId")::text,'null'),
    p.status, coalesce(p.progress::text,'null'), p."dueDate", p.priority, p.notes,
    coalesce(p."strategyId"::text,'null'), coalesce(p.links::text,'[]'),
    p.modified_by, p.modified_at), E'\n' order by p.id) t
  from projects p where p.id = 10010
),

-- ---------- deals (id 18) ----------------------------------------------------
s_deals as (
  select string_agg(format(
    'insert into public.deals (tenant_id,id,name,"contactId","companyId",value,stage,probability,"closeDate",notes,modified_by,modified_at) values (%L,%s,%L,%s,%s,%s,%L,%s,%L,%L,%L,%L);',
    '0a7225ba-7625-4881-8d8f-237424282b3b', d.id, d.name,
    coalesce((select b from ctmap where a = d."contactId")::text,'null'),
    coalesce((select b from cmap  where a = d."companyId")::text,'null'),
    coalesce(d.value::text,'null'), d.stage, coalesce(d.probability::text,'null'),
    d."closeDate", d.notes, d.modified_by, d.modified_at), E'\n' order by d.id) t
  from deals d where d.id = 18
),

-- ---------- tasks (ids 394-489) ---------------------------------------------
-- A.due is `date`, B.due is `text`; cast on the way across.
s_tasks as (
  select string_agg(format(
    'insert into public.tasks (tenant_id,id,title,due,priority,done,"assignedTo",notes,"projectId","contactId","companyId","dealId",status,category,source,recurrence,modified_by,modified_at) values (%L,%s,%L,%L,%L,%s,%L,%L,%s,%s,%s,%s,%L,%L,%L,%L,%L,%L);',
    '0a7225ba-7625-4881-8d8f-237424282b3b', t.id, t.title, t.due::text, t.priority, coalesce(t.done::text,'false'),
    t."assignedTo", t.notes,
    coalesce((select b from pmap  where a = t."projectId")::text,'null'),
    coalesce((select b from ctmap where a = t."contactId")::text,'null'),
    coalesce((select b from cmap  where a = t."companyId")::text,'null'),
    coalesce(t."dealId"::text,'null'),
    t.status, t.category, t.source, t.recurrence, t.modified_by, t.modified_at), E'\n' order by t.id) t
  from tasks t where t.id between 394 and 489
)

select concat_ws(E'\n\n',
 '-- Second Brain merge, phase 1. Generated from A by ops/merge-a-into-b/generate.sql.',
 '-- Run against B (fukehjqikxqsntwhmgsk). Single transaction; rolls back on any mismatch.',
 'begin;',
 '-- Guard: refuse to run twice.',
 'do $g$ begin if exists (select 1 from public.companies where id = 173) then'
 || ' raise exception ''phase 1 already applied (companies.173 exists)''; end if; end $g$;',
 (select t from s_campaigns),
 (select t from s_companies),
 (select t from s_contacts),
 (select t from s_projects),
 (select t from s_deals),
 (select t from s_tasks),
 '-- Resync sequences so the app does not collide with what we just inserted.',
 $seq$do $s$
declare r record;
begin
  for r in select c.relname tbl, a.attname col, pg_get_serial_sequence('public.'||c.relname, a.attname) seq
           from pg_class c join pg_attribute a on a.attrelid = c.oid
           where c.relname in ('campaigns','companies','contacts','projects','deals','tasks')
             and a.attname = 'id'
             and pg_get_serial_sequence('public.'||c.relname, a.attname) is not null
  loop
    execute format('select setval(%L, (select coalesce(max(id),1) from public.%I))', r.seq, r.tbl);
  end loop;
end $s$;$seq$,
 '-- Verify. Any mismatch aborts the whole transaction.',
 format($chk$do $c$
declare n int;
begin
  select count(*) into n from public.contacts  where tenant_id = %1$L; if n <> 377 then raise exception 'contacts: expected 377, got %%', n; end if;
  select count(*) into n from public.companies where tenant_id = %1$L; if n <> 172 then raise exception 'companies: expected 172, got %%', n; end if;
  select count(*) into n from public.tasks     where tenant_id = %1$L; if n <> 444 then raise exception 'tasks: expected 444, got %%', n; end if;
  select count(*) into n from public.projects  where tenant_id = %1$L; if n <>  19 then raise exception 'projects: expected 19, got %%', n; end if;
  select count(*) into n from public.deals     where tenant_id = %1$L; if n <>  12 then raise exception 'deals: expected 12, got %%', n; end if;
  select count(*) into n from public.campaigns where tenant_id = %1$L; if n <>   5 then raise exception 'campaigns: expected 5, got %%', n; end if;
  -- No orphaned foreign keys among the rows we just moved.
  select count(*) into n from public.tasks t where t.tenant_id = %1$L and t."projectId" is not null
    and not exists (select 1 from public.projects p where p.id = t."projectId" and p.tenant_id = %1$L);
  if n <> 0 then raise exception 'orphaned task.projectId: %%', n; end if;
  select count(*) into n from public.contacts ct where ct.tenant_id = %1$L and ct."companyId" is not null
    and not exists (select 1 from public.companies co where co.id = ct."companyId" and co.tenant_id = %1$L);
  if n <> 0 then raise exception 'orphaned contact.companyId: %%', n; end if;
end $c$;$chk$, '0a7225ba-7625-4881-8d8f-237424282b3b'),
 'commit;'
) as migration;
