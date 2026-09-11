# Second Brain — A → B merge audit

**Produced:** 2026-09-11, from live SQL against both databases.
**Decision it serves:** consolidate onto **B**, under the `Mendy Ezagui` tenant.
Supersedes the "keep them separate" plan in `second-brain-data-map.md`.

---

## The two databases

| | A | B |
|---|---|---|
| Project ref | `xwacfwagyhgbbhefecdt` | `fukehjqikxqsntwhmgsk` |
| Name | Second Brain | **secondbrain-os** |
| Organisation | `olgldqiwtbuuwlwatwaq` | **`nvkjwpbvkbtzyttmahfm`** (a different org) |
| Region | us-east-1 | us-east-1 |
| Created | 2026-03-13 17:01 UTC | 2026-08-12 14:50 UTC |
| Tenancy | single — no `tenant_id` | multi — `tenant_id` on every table |

B sits in a **second Supabase organisation**. `list_organizations` returns only
`olgldqiwtbuuwlwatwaq`, so B never appears in any listing call — but `get_project`
and `execute_sql` reach it normally. That is why an earlier session recorded B's
location as "unknown". It was never lost, only un-enumerable.

## How the split happened

```
2026-03-13 17:01   A created — the original Second Brain
2026-08-12 14:50   B created — secondbrain-os, in the new org
2026-08-12 15:44   tenant "JimOkorn" created (54 minutes after the project)
2026-08-13 17:51   tenant "Mendy Ezagui" created
2026-08-13 19:07   mendyezagui@gmail.com created in B
2026-08-13 21:50   bulk copy A → B   ← every seeded row carries modified_at 21:50:14.843
2026-08-18 19:15   mcp-mendy@secondbrain-os.test created — the 2nd_Brain connector's login
```

**The copy was a seed, not a cutover.** Nothing in A was switched off or repointed,
so from 2026-08-13 both databases were live and both kept being written.

Three mechanisms kept them diverging:

1. **The app selects its database by hostname, not by configuration.**
   `src/lib/utils.js` tests `secondbrain-app.pages.dev|os.aventary.com` → B;
   anything else → A. Same UI, same sign-in, different data, and nothing on
   screen says which one you are in.
2. **The `2nd_Brain` MCP connector signs in to B** (as `mcp-mendy@secondbrain-os.test`),
   while sessions using the Supabase connector reach A. Two Claude sessions could
   write to two different CRMs without either noticing.
3. **The loops run against both.** B has its own `loop_runs` (33), `loop_actions` (15)
   and `loop_signals` (38), and Apollo wrote contacts into B on 2026-09-08 and 09-10.
   An earlier note in `second-brain-data-map.md` said the automation only writes to
   A — that was wrong, and it is what produced the contact-id collisions below.

## Tenants in B

| Tenant | id | Members |
|---|---|---|
| Mendy Ezagui | `0a7225ba-7625-4881-8d8f-237424282b3b` | `mendyezagui@gmail.com` (owner), `mcp-mendy@secondbrain-os.test` (member) |
| JimOkorn | `45ec8fab-a2d0-4cd6-b5b2-7429bc973e66` | `jamesjokorn@gmail.com` (owner), plus a demo and an MCP account |

Jim's footprint is **53 rows** in total: 3 tasks, 1 project, 1 ai_memory,
48 agentlogs, 9 usage_events. Everything else in B is the Mendy tenant's.

**Isolation is sound — VERIFIED.** Every table in B has RLS enabled (no exceptions),
and every policy is `tenant_id IN (SELECT auth_tenant_ids())`. Jim's account cannot
read the Mendy tenant's rows.

**But RLS is not the whole perimeter.** The `client-page` edge function reads with
the service role, which bypasses RLS by design — that is how the Brown Bag Direct
proposal was served publicly, not any policy failure. Any function that opts out of
RLS has to be audited separately from the policies.

---

## The diff

A, against B restricted to the Mendy tenant:

| Table | A | B | Identical ids | Collisions | A-only to move | B-only |
|---|---|---|---|---|---|---|
| tasks | 444 | 348 | 348 (2–393) | 0 | **96** (394–489) | 0 |
| contacts | 375 | 199 | 198 (8–205) | **3** | **176** (206–384) | 3 |
| companies | 172 | 135 | 134 (1–134) | **1** | **38** (135–172) | 1 |
| projects | 17 | 18 | 15 | **2** | **1** | 3 |
| deals | 12 | 11 | 11 | 0 | **1** (id 18) | 0 |
| strategies | 11 | 11 | 11 | 0 | 0 | 0 |
| goals | 10 | 10 | 10 | 0 | 0 | 0 |

**312 rows and 6 colliding ids.** Tasks 2–393 are the same set on both sides;
strategies and goals are already identical.

### The six collisions — same id, different record

| Table | id | in A | in B |
|---|---|---|---|
| contacts | 206 | Mendy Ezagui | Luke Swanek |
| contacts | 207 | Miki | Amrita Sekhar |
| contacts | 208 | Alex Gertel | Micah Hiller |
| companies | 135 | Actum Processing | Prime Rock Realty |
| projects | 10010 | Cheder Menachem — Graphite replacement | Rambam 30-Day Leaderboard |
| projects | 10011 | Prime Rock Realty — Broker Operator System | Brown Bag Direct — Discovery Engagement |

Every A-side row here needs a new id in B, and every foreign key pointing at it
must be rewritten in the same transaction: `companyId`, `contactId`, `projectId`,
`dealId`, `referredBy`, `strategyId`.

### Already in B under a different id — dedupe, do not move

| | A | B |
|---|---|---|
| Prime Rock Realty (company) | 172 | 135 |
| Micah Hiller (contact) | 384 | 208 |
| Prime Rock Realty (project) | 10011 | 10012 |

Written into both on 2026-09-11 sixteen minutes apart, by two sessions on two
connectors. Compare the two notes fields before dropping either — B's project note
is the longer of the two.

### A-only records worth naming

- **Cheder Menachem / LCLA**: company 171, contact 383 (Avremi Chein),
  project 10010, deal 18. B has none of it.
- **Contacts 209–234**: the Rambam learning group.
- **Companies 135–170**: the MCA / lending list (Actum Processing → Velocity Capital Group).
- **Tasks 394–489**: everything since 2026-08-13, including the whole Cheder Menachem
  workstream (468–488).

---

## Status: phase 1 applied 2026-09-11

The 313 rows below are **in B**, verified byte-for-byte, with every pre-existing row
proven unchanged by hash. See `../ops/merge-a-into-b/RESULT.md` for the evidence.
A is **not** yet disposable — see `second-brain-schema-gap.md` for what remains.

## Order of work

1. **Back up both databases.** Nothing below starts before a restorable snapshot exists.
2. **Stop the writers**, or accept that anything written mid-migration is lost. The
   loops run against both databases — that is what re-split them last time.
3. **Build the id map** for the 6 collisions and the 3 duplicates, as data, not as
   a script constant.
4. **Move the 312 rows**, rewriting every foreign key in the same transaction,
   stamping `tenant_id = 0a7225ba-7625-4881-8d8f-237424282b3b`.
5. **Add the columns A has that B lacks**, or accept losing them — check `files`
   on projects, `reschedule_count` on tasks.
6. **Repoint every writer at B**, including the personal app host, and turn A
   read-only rather than deleting it.
7. **Re-run this audit.** It should come back empty.

Migrations belong in `supabase/migrations/` and go in through CI. The reason this
document exists is that the last consolidation was done by hand, live, with no
record — which is precisely why nobody could tell afterwards what had happened.
