# The CRM in Database A is frozen

**Applied 2026-09-11.** Reads still work. Nothing can write.

The Second Brain CRM lives in **secondbrain-os** (`fukehjqikxqsntwhmgsk`). The old copy in
`xwacfwagyhgbbhefecdt` is now a read-only archive.

## Why

A and the product database diverged for a month because whichever tool happened to be
pointed at A kept writing to it — that is how `projects.10010` ended up being two
different projects, and `contacts.206` two different people. Remembering which project is
which was never going to hold. This closes the door instead.

## What is frozen — 19 tables

```
contacts  companies  deals  projects  tasks
invoices  payments   payment_allocations
campaigns cadences   cadence_steps  cadence_enrollments
strategies goals     company_news   ai_memories  documents  voicenotes  events
```

## What is NOT frozen, on purpose

`agentlogs`, `loop_runs`, `loop_actions`, `loop_signals`, `loops`, `associates`,
`associate_runs`, `associate_drafts`, `site_analyses`, the `sofa_*` tables,
`unclaimed_watchlist`, `contentCalendar`, `content_queue`, `socialCampaigns`,
`socialStrategy`, `vantaca_*`, `voitra_gate_state`, `board_sets`, `children`,
`bp501_static`, `poc_leads`.

Those are automation telemetry and side projects, not CRM. Freezing them would break live
edge functions — the hourly `associate-tick`, the daily `sofa-jcc-scan`, `loops-dispatcher`
— for no benefit.

## How it works — two layers

**1. Grants revoked.** `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` removed from `anon`,
`authenticated` and `service_role` on all 19 tables.

**2. A statement-level BEFORE trigger**, `aaa_crm_frozen`, on every one of them. This is
the real backstop: triggers fire regardless of privilege, so it also catches the table
owner and any superuser path that grants alone would miss. Named to sort first so nothing
else runs before it.

A blocked write raises `insufficient_privilege` with a message naming the table, where the
CRM actually lives, and how to lift the freeze.

## Verified, not assumed

| Check | Result |
|---|---|
| Tables targeted | 19 |
| `aaa_crm_frozen` triggers installed | **19** |
| Tables still granting writes to anon/authenticated/service_role | **0** |
| `select count(*) from contacts` | 375 — reads fine |
| `select count(*) from tasks` | 444 — reads fine |
| Live write probe against all 19 | **all blocked** |

## What this breaks, and that is the point

Every write to A's CRM in the 21 days before the freeze came from a Claude session —
`claude`, `claude-mcp`, `claude-code`, `Claude (Cowork)`, `claude-cowork`. Those will now
fail with a clear error instead of silently re-forking the data. That is the whole idea.

The one piece of live automation affected is **`associate-tick`**, which wrote 2
`ai_memories` rows in that window. It will now error on those writes until the Associates
framework moves to secondbrain-os. Nothing else is touched.

The Apollo loops were never writing here — they write to secondbrain-os already.

The personal Second Brain app deploy, if it still points at this project, becomes
read-only for CRM screens.

## Lifting it

Deliberately, one table at a time:

```sql
alter table public.contacts disable trigger aaa_crm_frozen;
grant insert, update, delete on public.contacts to service_role;
```

If you find yourself doing this, ask why the writer is not pointed at secondbrain-os.
