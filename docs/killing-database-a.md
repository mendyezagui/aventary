# What it actually takes to switch off Database A

**Compiled 2026-09-11**, from a full inventory of A (`xwacfwagyhgbbhefecdt`): tables,
edge functions, storage, auth, cron and triggers. Companion to
`second-brain-phase2-plan.md`.

---

## The headline

**A is not a database with a few functions attached. A is the backend for voitra.ai.**

Of A's 43 active edge functions, roughly **27 serve the Voitra website** — the homepage,
verticals, pricing, FAQ, integrations, the nav bundle, four blog posts, four agent guides,
the resources index, the widget, the gate, the admin, the lead capture, and the site
analyzer. They are not CRM. They were never CRM. They happen to live in the same project.

Killing A therefore is not a data migration. It is **moving a website**.

Second: **TalkBoard's user accounts live in A's auth**, and A's storage holds **74 files**
that CRM records point at. Neither has anywhere to go yet — B has **no storage buckets at
all**.

---

## Blockers, in order of how much they hurt

### 1. Storage — 74 objects, and B has no buckets

| Bucket | Objects | Visibility |
|---|---:|---|
| `memory-files` | **72** | **PUBLIC** |
| `demo` | 1 | PUBLIC |
| `temp-upload` | 1 | PUBLIC |
| `llm-attachments` | 0 | private |

`memory-files` is what `projects.files`, `strategies.files` and `ai_memories.files` point
at — five projects and three strategies carry attachments. Delete A and those files are
gone and the references dangle.

B has **zero** storage buckets. They have to be created, the objects copied, and every
`files` jsonb reference rewritten to the new URLs.

> **Worth its own look regardless of the migration:** `memory-files` is PUBLIC. 72 files
> attached to projects, strategies and AI memories are readable by anyone holding the URL.
> That is the same class of thing as the bbdc page.

`llm-attachments` is empty and belonged to the playground that was dropped — safe to
delete now.

### 2. Auth — 4 users on A, two of them TalkBoard's

```
mendyezagui@gmail.com            (also exists in B)
avistudiocity@gmail.com
mendyezagui+talkboard@gmail.com  ← TalkBoard
mendy@talkboard.app              ← TalkBoard
```

`children.parent_id` and `board_sets.parent_id` are uuids pointing at these rows.
TalkBoard is a live app with a real child profile on it. **Killing A logs its users out
permanently** and orphans the board data.

Auth users cannot be "moved" — a new project means new user ids, so the references have
to be remapped and the users re-invited.

### 3. pg_cron — one live schedule left on A

| Job | Schedule | Calls | Status |
|---|---|---|---|
| `associate-tick` | `0 * * * *` (hourly) | `/functions/v1/associate-tick` | **disabled 2026-09-11** — ported to B, now job 5 there |
| `sofa-jcc-daily-scan` | `30 14 * * *` | `/functions/v1/sofa-jcc-scan` | still live on A |

Both fire `net.http_post` at A's own functions. B has pg_cron 1.6.4 installed, so these
can be recreated — but only after the functions themselves are on B. `associate-tick` was
disabled rather than unscheduled, so its command text is still readable if anyone needs to
see what used to run here.

### 4. Triggers — two of them are the money logic

| Trigger | What it does |
|---|---|
| `invoices.trg_invoices_sync_balance` | maintains `amount_paid` / `outstanding` |
| `payment_allocations.trg_payment_allocations_sync` | keeps allocations and balances in step |
| `content_queue.content_queue_updated_at` | timestamp bump, trivial |

**This explains the schema gap.** B is not merely missing `amount_paid` and `outstanding`
columns — B never had the logic that maintains them. Migrating invoices and payments means
porting these triggers and reconciling two different models of money (A tracks
invoice→payment through `payment_allocations`; B puts `invoiceId` on the payment).

### 5. Edge functions — 43 on A, 19 on B

Already ported and running on B: `llm-proxy`, `loops-dispatcher`, `rc-queue-toggle`,
`rc-scheduler-tick`, `rc-call-log`. **RingCentral is done** — B has the `rc_*` tables with
live data.

Still only on A, grouped by what they actually are:

| Group | Count | Examples |
|---|---:|---|
| **voitra.ai website** | ~27 | homepage-v2, verticals-v2, pricing, faq, integrations, nav-bundle, blog ×4, agent-guide ×4, resources-index, widget, gate, admin, poc-submit, home-nemt-v1 |
| Site analyzer | 3 | `analyze-site`, `site-results`, `homepage-analyzer-widget` |
| SoFa JCC | 1 | `sofa-jcc-scan` |
| ~~Associates~~ | 1 | `associate-tick` — **superseded 2026-09-11**; the live one is on B. Its tables here are dropped, so this copy can only 500. Safe to delete whenever the dead-function sweep happens. |
| Retell | 2 | `retell-web-call`, `retell-lead` |
| bp501 demo | 2 | `bp501-demo`, `bp501-publish` |
| Jewish Dashboard | 1 | `jewish-dashboard` |
| Calendar | 2 | `calendar-sync`, `calendar-action` |
| Dead — drop these | 2 | `revops-dashboard`, `update-page` (their table is gone) |
| Vantaca/RC leftovers | 2 | `rc-controls`, `rc-debug` |

### 6. Tables — 48 left in A

Phase 1 moved the CRM core; those rows still exist in A as well and are now duplicates to
retire, not migrate. What genuinely still has to move or be dealt with is in
`second-brain-phase2-plan.md`, plus the shared-table deltas in
`second-brain-schema-gap.md`.

---

## So: can A be killed?

**Yes — but "kill A" is the wrong unit of work.** A is three products sharing a Postgres:

1. **The CRM** — being migrated to B. This part is real and nearly done.
2. **voitra.ai** — a whole website, ~27 edge functions, its own gate and lead capture.
3. **Side projects** — TalkBoard (with its own users), SoFa JCC, Jewish Dashboard, bp501,
   the resale watchlist, calendar sync.

Moving 2 and 3 *into B* would be a mistake. B is a multi-tenant CRM product with another
real tenant on it. A marketing site's page-serving functions and a speech app's user
accounts have no business inside it.

### The honest options

**Option A — Split, don't kill.** Give Voitra its own Supabase project and TalkBoard its
own. Finish moving the CRM to B. A ends up empty and *then* dies for real.
Biggest job, correct end state. The Voitra move is the bulk of it.

**Option B — Demote A.** Finish the CRM migration, retire what is dead, and let A remain
what it already is: the Voitra + side-projects backend. Rename it so nobody mistakes it
for the CRM again. Cheapest, honest, and A never dies.

**Option C — Kill A properly, now.** Everything above, in one push. Realistically a
multi-day project dominated by moving voitra.ai and re-establishing TalkBoard's auth.

**Recommendation: B now, A later.** Demote A immediately — it stops being the CRM, which
is the problem that has actually been costing you. Then move Voitra to its own project as
a separate piece of work when it is worth the day, and only then is "kill A" a small job
instead of a scary one.

### Ordered checklist, whichever option

- [ ] Create storage buckets in B, copy 74 objects, rewrite `files` references
- [ ] Make `memory-files` private, or confirm public is intended
- [ ] Delete the empty `llm-attachments` bucket
- [ ] Delete `revops-dashboard`, `update-page` and A's `associate-tick` — their tables are gone
- [ ] Port the two invoice/payment triggers, reconcile the two money models
- [x] Move the Associates group
- [x] Move the social/content group (copies still live on A — see below)
- [ ] Move the remaining phase-2 groups (SoFa JCC, Vantaca, lead capture)
- [ ] Repoint the personal app deploy at B, **then** drop A's `contentCalendar`, `content_queue`, `socialCampaigns`, `socialStrategy` — until that happens both copies are writable and can diverge
- [x] Port `associate-tick` to B, recreate its pg_cron job there, disable A's job 6
- [ ] Port `sofa-jcc-scan` to B and recreate its pg_cron job there
- [ ] Close the shared-table deltas (agentlogs 735, events 142, cadence_enrollments 95, payment_allocations 30)
- [ ] Decide TalkBoard's home; remap `children` / `board_sets` parent ids to new auth users
- [ ] Decide Voitra's home; move ~27 edge functions and its DNS/routing
- [ ] Repoint the personal app deploy off A
- [ ] Set A read-only, verify nothing breaks for a full week
- [ ] Only then delete
