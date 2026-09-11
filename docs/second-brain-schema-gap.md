# A → B schema gap — what B is missing before A can be switched off

**Produced:** 2026-09-11, from `information_schema` on both databases plus row counts
on every column in question. Companion to `second-brain-merge-audit.md`.

**The decision this serves:** keep **B** (`fukehjqikxqsntwhmgsk`, secondbrain-os),
retire **A** (`xwacfwagyhgbbhefecdt`). A cannot be switched off until everything below
has a home in B or has been explicitly written off.

> The phase-1 migration in `ops/merge-a-into-b/generate.sql` moves 313 rows across
> the seven core CRM tables. **It does not make A disposable.** This file is the rest.

---

## Short answer

- **Does B have more than A?** Yes — 18 tables A never had. All additive, nothing to do.
- **Does B miss things A has?** **Yes.** 27 whole tables (3,175 rows) and 26 columns
  across 10 shared tables. **Every one of those columns is populated in A.**

---

## 1. Tables in A with no equivalent in B — 27 tables, 3,175 rows

| Table | Rows | What it is |
|---|---:|---|
| `unclaimed_watchlist` | **2,918** | the largest table in A |
| `contentCalendar` | 86 | social content planning |
| `site_analyses` | 44 | spectari / site-analysis output |
| `llm_messages` | 35 | multi-LLM chat history |
| `vantaca_audit` | 21 | Vantaca MCP call audit |
| `associates` | 18 | the associates/agent framework |
| `associate_drafts` | 9 | |
| `content_queue` | 7 | |
| `llm_conversations` | 6 | |
| `bp501_static` | 5 | |
| `socialCampaigns` | 4 | |
| `associate_runs` | 4 | |
| `socialStrategy` | 3 | |
| `sofa_events` | 3 | SoFa JCC |
| `poc_leads` | 3 | |
| `sofa_nudges` | 2 | SoFa JCC |
| `board_sets`, `children` | 1 each | |
| `static_pages` | 1 | |
| `vantaca_controls` | 1 | |
| `voitra_gate_state` | 1 | |
| `sofa_flyers`, `sofa_work_orders` | 1 each | SoFa JCC |
| `diagnostic_leads`, `push_subscriptions`, `secondbrain_waitlist`, `sofa_speakers` | 0 | empty — schema only |

Several of these are whole subsystems (SoFa JCC, Vantaca, associates, the multi-LLM
view, Voitra's gate). They are not CRM data and may not belong in a multi-tenant
product at all — but they are live, and A is where they live.

## 2. Columns A has that B lacks — and all of them hold data

| Table | Missing in B | Rows in A using them |
|---|---|---:|
| `events` | `title`, `type`, `date`, `start_time`, `end_time`, `location`, `attendees`, `notes`, `google_event_id`, `companyId`, `contactId`, `projectId`, `dealId`, `invoiceId` — **14 columns** | **142 of 142** |
| `invoices` | `amount_paid`, `outstanding` | **50 of 51** |
| `payments` | `payer`, `payer_type`, `reference` | **26 of 26** |
| `goals` | `category`, `description`, `priority_order`, `weight` | **10 of 10** |
| `projects` | `files` | 5 |
| `voicenotes` | `summary` | 4 of 4 |
| `strategies` | `files` | 3 |
| `instructions` | `created_at`, `priority` | 1 of 1 |
| `tasks` | `reschedule_count` | 6 |
| `payment_allocations` | *renamed*: A `invoice_id`/`payment_id` → B `invoiceId`/`paymentId` | 30 in A, **0 in B** |

Two of these are worse than a missing column:

- **`events` is a different table in the two databases.** In A it is a calendar —
  142 rows with titles, times, locations, attendees and Google event ids. In B it is
  a bare audit log (`entity_type`, `event_type`, `metadata`, `ts`) with **0 rows**.
  Same name, unrelated purpose. Moving A's events needs 14 new columns or a new table.
- **`payments` and `invoices` are financial records.** B drops `amount_paid`,
  `outstanding`, `payer`, `payer_type` and `reference`, all of which are populated.
  B also adds `payments.invoiceId`, which A does not have — A tracks that relationship
  in `payment_allocations` instead. **The two databases model money differently.**
  This needs a deliberate reconciliation, not a column-add.

Also note `tasks.due` is `date` in A and `text` in B. Phase 1 casts it; a full
migration should decide which type is correct rather than keep casting.

## 3. Tables B has that A does not — 18, all additive

`tenants`, `tenant_members`, `usage_events`, `mcp_tokens`, `oauth_states`,
`gmail_connections`, `gmail_secrets`, `email_thread_state`, `task_priority_scores`,
`project_blocks`, `kg_nodes`, `kg_edges`, `rc_activity`, `rc_schedules`,
`rc_schedule_runs`, `rc_scheduler_settings`, `rc_triggers`, `rc_rc_token`.

Tenancy, usage metering, Gmail OAuth, the knowledge graph, RingCentral, and the
client-page blocks. Nothing to migrate; this is what B is *for*.

## 4. Row deltas in shared tables, beyond the phase-1 seven

Phase 1 covers campaigns, companies, contacts, projects, deals and tasks. These
shared tables are still out of sync and are **not** in the phase-1 migration:

| Table | A | B (Mendy tenant) | Delta |
|---|---:|---:|---:|
| `agentlogs` | 806 | 71 | **735** |
| `events` | 142 | 0 | **142** |
| `cadence_enrollments` | 153 | 58 | **95** |
| `company_news` | 128 | 99 | **29** |
| `payment_allocations` | 30 | 0 | **30** |
| `cadence_steps` | 37 | 26 | **11** |
| `invoices` | 51 | 49 | 2 |
| `cadences` | 8 | 6 | 2 |
| `ai_memories` | 42 | 40 | 2 |
| `voicenotes` | 4 | 0 | 4 |
| `instructions` | 1 | 0 | 1 |
| `loop_runs` / `loop_actions` / `loop_signals` | 56 / 8 / 15 | 33 / 15 / 38 | diverged both ways |
| `documents` | 41 | 41 | verify by id |
| `payments` | 26 | 26 | same count, **different shape** |

The loop tables diverged in *both* directions — each database ran its own loops —
so those are not a copy, they are two separate histories.

---

## What it would take to switch A off

1. **Phase 1** — `ops/merge-a-into-b/generate.sql`. 313 rows, seven tables. Ready.
2. **Decide, per item in §1, one of:** port it to B, move it to its own project, or
   write it off. SoFa JCC, Vantaca and Voitra are plausibly their own projects
   rather than tenants of a personal CRM.
3. **Add the columns in §2 to B**, except `events` and the money tables, which need
   a design decision first.
4. **Reconcile invoices / payments / payment_allocations** deliberately.
5. **Migrate the §4 deltas**, choosing a rule for the loop tables.
6. **Repoint every writer at B** and set A read-only. Do not drop A — keep it
   readable until the re-run of the audit comes back empty.

**Do not switch A off after phase 1.** Phase 1 makes B correct for CRM. It leaves
3,175 rows, 26 populated columns and ~1,000 rows of shared-table delta behind.
