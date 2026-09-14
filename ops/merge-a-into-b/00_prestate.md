# B pre-state, captured immediately before phase 1

**Captured:** 2026-09-11, from `fukehjqikxqsntwhmgsk`, tenant
`0a7225ba-7625-4881-8d8f-237424282b3b`.

This is **not** a PITR snapshot — the Supabase MCP connector exposes no backup tool,
and taking a real one is a click in the dashboard. What it is instead is an exact
fingerprint of every table phase 1 touches, which is sufficient because **phase 1 is
insert-only**:

- Primary key on all six tables is `(tenant_id, id)`, so nothing inserted can collide
  with the JimOkorn tenant.
- The only trigger on any of them is `trg_email_task_done`, `AFTER UPDATE ON tasks`.
  An insert never fires it.
- `companyId` / `contactId` / `projectId` / `dealId` are plain integers, not enforced
  foreign keys. The only FK is `tenant_id → tenants`, so there is no cascade path.

Therefore nothing that exists in B can be modified or deleted by phase 1. The md5s
below prove it: re-run the same query afterwards and every pre-existing row must hash
identically. The undo is `99_rollback.sql`, which deletes exactly the ids added.

| Table | Rows | md5 of contents (ordered by id) |
|---|---:|---|
| campaigns | 4 | `261d9d98593cba30da98dcb7e5229666` |
| companies | 135 | `675f8e70ede8af2eef6a75d1e63a58a0` |
| contacts | 199 | `0aa2efa252bc165fbd877bbb64b565c6` |
| deals | 11 | `4f6dd6506e89584a6eeb676ddb3fdcc7` |
| projects | 18 | `21ac74fcf9f7816bb8c06a92c26cc352` |
| tasks | 348 | `79c205522e3f3a19115aa9c7f92e0868` |

Id ranges present before the merge:

- **campaigns** 1–4
- **companies** 1–135 (contiguous)
- **contacts** 8–208 (gaps at 13, 47)
- **deals** 6–12, 14–17
- **projects** 9, 11, 13–17, 10001–10005, 10007–10012
- **tasks** 2–393 (sparse)

Every id phase 1 writes is free in those ranges — verified, not assumed.

## Re-verification query

```sql
with t as (select unnest(array['campaigns','companies','contacts','projects','deals','tasks']) tbl)
select string_agg(format('%s | rows=%s | md5=%s',
  tbl,
  (xpath('/row/c/text()', query_to_xml(format($f$select count(*) c from public.%I where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'$f$, tbl),false,true,'')))[1]::text,
  (xpath('/row/c/text()', query_to_xml(format($f$select md5(coalesce(string_agg(x::text,'|' order by id),'')) c from public.%I x where tenant_id='0a7225ba-7625-4881-8d8f-237424282b3b'$f$, tbl),false,true,'')))[1]::text
), E'\n' order by tbl) from t;
```

After phase 1 the counts become campaigns 5, companies 172, contacts 377, deals 12,
projects 19, tasks 444. The md5s will differ because rows were added; to prove nothing
*existing* changed, re-run the md5 restricted to the pre-merge id ranges above — those
must match this table exactly.
