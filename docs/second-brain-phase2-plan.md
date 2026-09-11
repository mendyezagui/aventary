# Phase 2 — what happens to the 27 A-only tables

**Decisions taken by Mendy, 2026-09-11.** Phase 1 (the 313 CRM rows) is done; see
`../ops/merge-a-into-b/RESULT.md`. This file covers what is left in A.

---

## The thing that makes this bigger than it looks

**A is not just a database. It is hosting 43 active edge functions** — voitra.ai pages,
blog posts, agent guides, widgets, the SoFa JCC scanner, RingCentral controls and lead
capture endpoints. The tables are the easy part.

The unit of migration is therefore **table + its edge functions + the app view**, not the
table alone. Move `sofa_events` to B without redeploying `sofa-jcc-scan` against B and the
scanner silently breaks.

Traffic in the last 24 hours — the only three functions with any hits:

```
associate-tick   15   → Associates framework
sofa-jcc-scan     9   → SoFa JCC
voitra-gate       3   → Voitra gate
```

**This does not prove the other 40 are dead.** 24 hours is the longest window the logs
API allows, and a low-traffic marketing page looks identical to a dormant one. Check
before deleting anything that serves a public URL.

---

## Associates: data moved to B, 2026-09-11

All 31 rows are in B under the Mendy tenant, verified byte-for-byte:

| Table | Rows | md5 (A) | md5 (B) |
|---|---:|---|---|
| `associates` | 18 | `324e239adeecccb1960142b6ed4efbb1` | **match** |
| `associate_runs` | 4 | `390fc370b33cc81db52b19bc56e8b38a` | **match** |
| `associate_drafts` | 9 | `1bded1fe1f6d0883ed13821f17dca5f0` | **match** |

No id remapping was needed: B's tables were empty so ids carry 1:1, and every draft's
`contactId` / `companyId` / `dealId` / `projectId` was null, so there were no CRM
references to rewrite against the phase-1 map.

Drafts 1–3 have a `body` byte-identical to their run's `output` (checked in A before the
move), so their bodies were copied from the runs already in B rather than transcribed a
second time — one source of truth, and no way for the two to drift in transit.

Identity sequences were left at 1 by the explicit-id inserts, which would have collided on
the next app insert. Fixed with `setval` and proved with an insert-probe on each table
that had to land above the migrated range; the probe rows were removed.

### The runtime, ported 2026-09-11

`associate-tick` now runs on B and A's job is off.

| | A (`xwacfwagyhgbbhefecdt`) | B (`fukehjqikxqsntwhmgsk`) |
|---|---|---|
| edge function | still deployed, now orphaned | **`associate-tick` v1, `verify_jwt` off** |
| pg_cron | job 6, `0 * * * *` — **disabled** | **job 5, `0 * * * *` — active** |

The planning logic did not change. It is the same two modules the browser console
imports, still pinned to commit `2385386`, so the cron and the console cannot disagree
about what an associate saw. Only the IO changed, and every change is because B is
multi-tenant and A was not:

1. **Every read is scoped to a tenant.** Service role bypasses RLS, so one forgotten
   `.eq("tenant_id")` would hand Mendy's associate Jim's pipeline. That is the exact
   failure this consolidation exists to end, and it would have been introduced by a
   straight copy of A's function.
2. **Every write sets `tenant_id`.**
3. **`agentlogs`, `ai_memories`, `documents` and `tasks` have no identity on `id` in B** —
   they were imported with explicit ids — so the runtime allocates one per tenant and
   retries on collision. `associates` / `associate_runs` / `associate_drafts` do have
   identity and are left to the database.
4. **`verify_jwt` is off and the token is checked in the function**, matching
   `loops-dispatcher`: `CRON_SECRET` runs every tenant, a signed-in user's JWT runs only
   their own, and no token at all is a 401 before any model call.
5. **A declared table that does not exist in B is named in `missing_tables`** and in the
   tick's `agentlogs` line, instead of silently reading zero rows. Empty-and-silent is how
   an associate looks healthy for a month while reading nothing.

The source of record is `ops/associates-runtime/associate-tick.ts` in this repo.

**Proved end to end**, not just deployed:

- `GET` dry run: Jim's tenant `0 due of 0`, Mendy's `0 due of 18` with all eighteen held
  for the right reason (two custom runtimes, three wrong weekday, twelve manual,
  `project-status` already ran today).
- Live tick with `now=2026-09-18T16:30:00Z`, which makes exactly one associate due:
  `project-status` returned `status: ok`, wrote `associate_runs` id 6 and
  `associate_drafts` id 11 under the Mendy tenant, and the tick log landed in `agentlogs`
  at an allocated id — so the id-allocation path is exercised, not assumed. Jim's tenant
  produced nothing.
- Those three rows were then deleted and `last_run_at` restored. A test run dated
  2026-09-18 left in place would have made the real 2026-09-18 tick skip `project-status`
  as "already ran today".

**A's three tables are dropped.** The 20:00 UTC tick on B fired on its own — `cron.job_run_details`
job 5 `succeeded`, and `net._http_response` 33423 returned **HTTP 200** with `mode: cron`,
two tenants, Jim's `0 due of 0` and yours held correctly. That is the schedule working
unattended, not just on demand, which is what the drop was waiting on.

Re-verified whole-row immediately before dropping — stronger than the migration-time check,
which compared a shared column subset:

| Table | Rows (A = B) | md5, both sides |
|---|---:|---|
| `associates` | 18 | `754627e63ab06ef1cf631d1403e4ad3a` |
| `associate_runs` | 4 | `d3d38793ff4482d60e7816881003d69e` |
| `associate_drafts` | 9 | `531c5108c59040c1aae06ac9f2800b90` |

A's hourly tick wrote nothing new between the data move and the disable (counts never left
18/4/9), and the match also confirms the verification run's cleanup restored `last_run_at`
exactly. Dropped with the default RESTRICT, so a forgotten dependency would have failed the
migration rather than quietly taking whatever hung off it.

The only thing left on A is the orphaned `associate-tick` edge function, which can now only
500. It goes with the dead-function sweep.

~~**`content-brain` will fail its requirements in B**~~ — fixed by the content-table move
below. A dry tick dated to next Monday now returns `missing_tables: []` and a real context
digest for `content-brain`: `socialStrategy` 1, `content_queue` 7, `contentCalendar` 12,
`company_news` 12, `goals` 6, `ai_memories` 1 — **0 gaps**.

## site_analyses — reversed, 2026-09-11

**Not retiring it. It is a live funnel, and Mendy wants it as an Associate.**

`analyze-site` publishes to **`https://voitra.ai/for/<slug>`**. Its system prompt opens
*"You are Voitra, an AI voice agent platform"* — a visitor pastes their URL and gets three
recommended voice agents with savings benchmarks per industry. Three-provider fallback
(Anthropic → OpenAI → Google), 30 requests/IP/hour, 24-hour cache, `view_count` tracking
whether the prospect opened their page. No rows since 2026-05-29 only because the widget
is not currently embedded on voitra.ai.

**The new Associate is a different motion from the existing one.** Today's flow is
*inbound self-serve*: a visitor analyses their own business. What Mendy described —
"analyze the people who work there, analyze their LinkedIn" — is *outbound prospect
research*: he points it at a target. You would never show a visitor a dossier on their
own staff. Both can share one table, distinguished by the new `kind` column
(`voitra-inbound` | `bd-research`).

### Done: schema created in B

`associates`, `associate_runs`, `associate_drafts` and `site_analyses` now exist in B,
mirroring A exactly, plus B's conventions: `tenant_id uuid` referencing `tenants` with
`on delete cascade`, composite `(tenant_id, id)` primary keys, RLS enabled with the same
`tenant_id in (select auth_tenant_ids())` policy every other table uses, and
`unique (tenant_id, slug)` on associates and site_analyses.

Three columns added to `site_analyses` for the people layer:

| Column | Purpose |
|---|---|
| `kind` | `voitra-inbound` (the existing 44) vs `bd-research` (the new associate) |
| `people` | `[{name, title, linkedin_url, email, seniority, source}]` |
| `company_profile` | enrichment — size, funding, tech stack, locations |

### Still to do

1. Move the data: 18 associates, 9 drafts, 4 runs, 44 analyses.
2. Write the new associate row — `brief`, `inputs`, `rails`, `requirements`.
3. Build the runtime. This is `runtime: custom`, like `sofa-jcc` — it needs web fetch,
   Apollo, and a page writer, which a `prompt` associate cannot do.
4. Deploy it to B. **Needs secrets on B that this session cannot set:**
   `ANTHROPIC_API_KEY` and an Apollo key.
5. A page renderer on B, equivalent to A's `site-results`.

**Recommended people source: Apollo.** Already paid for, already the origin of most
contacts in the CRM ("Sourced via Apollo"), and `apollo_organizations_enrich` plus
`apollo_mixed_people_api_search` do exactly this — company enrichment, then people with
titles and LinkedIn URLs. Scraping LinkedIn directly is against their terms and breaks
constantly.

---

## Social / content tables: moved to B, 2026-09-11

100 rows across four tables, all under the Mendy tenant, verified byte-for-byte:

| Table | Rows | md5, both sides |
|---|---:|---|
| `contentCalendar` | 86 | `ab21fba3ff3fbee785bacb96f1ceac78` |
| `content_queue` | 7 | `e95c6b2c30bb9d8f28135bef75ed995d` |
| `socialCampaigns` | 4 | `27613299c6a0a88d8a4b1a6578fa381f` |
| `socialStrategy` | 3 | `af5db1247e670c035443a1d2c07270fc` |

### How the rows got across

There is no server-to-server path between the two projects, and the obvious route — read
174 KB of rows into a chat transcript and retype them into an `INSERT` — puts a
3,781-character LinkedIn script through a quoting round-trip where one bad escape corrupts
a row silently and the md5 check afterwards only proves I copied my own mistake faithfully.

So instead: a narrow `import-rows` edge function on B, and `net.http_post` from A sending
`to_jsonb(row) || {"tenant_id": …}` straight to it. Postgres renders the JSON, PostgREST
parses it, and nothing is reformatted in between. Five requests, all HTTP 200:
3 + 4 + 7 + 43 + 43 = 100. `contentCalendar` went in two halves so an oversized body could
not be the failure and a partial failure would name its half.

`import-rows` is **retired**: redeployed as a 410 stub *and* flipped to `verify_jwt: true`,
so the shared secret that opened it is now rejected at the platform layer before the body
runs. Both files are kept in `ops/content-tables/` — the MCP surface has no
delete-function call, so a tombstone is how an endpoint goes out of service here.

### What changed in the schema

Column names are kept exactly as they were, camelCase and all. They are not prettier that
way, but `content-brain`'s `inputs` name these columns literally, so renaming would have
broken the very thing the move exists to fix.

Tenancy is added the way every other table in B does it: `tenant_id`, a composite
`(tenant_id, id)` primary key, and a `tenant_isolation` policy. One deliberate change:
`socialStrategy`'s `UNIQUE (platform)` becomes `UNIQUE (tenant_id, platform)` — a global
unique would mean the first tenant to write a LinkedIn strategy locks every other tenant
out of having one.

Identity sequences were re-synced and **proved by insert-probe**, not by reading
`pg_sequences` — `last_value` there lies about a sequence that has never been read. Each
probe had to land above the imported maximum or the migration raised and rolled back;
probes were deleted. `contentCalendar` 89, `content_queue` 8, `socialCampaigns` 5,
`socialStrategy` 4, zero probes left behind.

The security advisor reports nothing against the four new tables.

### The copies on A are still there, and that is a decision

**A's four tables were not dropped.** The personal app deploy still points at A (see the
kill-A checklist), and the app's `social` and `marketing` views read these tables. Dropping
them would break Mendy's Social tab today, which is not something to do as a side effect of
a data move.

That leaves two copies that can now diverge — the disease this whole consolidation is
curing — so it needs closing one of two ways, and it is Mendy's call which:

1. **Repoint the personal app deploy at B**, then drop A's four tables. Correct, and it is
   on the kill-A checklist anyway.
2. **Freeze A's four tables** the way the CRM tables were frozen, so the Social tab can
   still read but cannot fork. Faster, but an edit in the app would then fail visibly.

Doing nothing is the one option that is actually wrong: every day both copies are writable
is another day of the exact problem that started this.

---

## SoFa JCC and Vantaca: moved to B, 2026-09-11

29 rows across seven tables, all under the Mendy tenant, all md5-identical:

| Table | Rows | md5, both sides |
|---|---:|---|
| `sofa_events` | 3 | `49cc5c9eecaaab8db9af4767ef2960a3` |
| `sofa_flyers` | 1 | `49ec5fbcaae7eb1d2e5024ebfc199085` |
| `sofa_nudges` | 2 | `c8cc627f5743f1ca0c361620892ffd07` |
| `sofa_work_orders` | 1 | `924638bfb27aeceaaac2a8dbaedbd457` |
| `sofa_speakers` | 0 | — (empty in A) |
| `vantaca_controls` | 1 | `b07dd434382ad2b33739d2f472a2187f` |
| `vantaca_audit` | 21 | `f0694c4e5318f44ca45d4b02bff7452f` |

### Two things went wrong, and both were caught by checks rather than by luck

**The foreign keys rejected the first push, correctly.** All six tables were
queued from one transaction on the assumption that pg_net sends in the order it
was handed the requests. It does not. The three SoFa child tables arrived before
their parent rows and `sofa_flyers_tenant_id_event_id_fkey` refused them — which
is precisely the job those keys were kept for. Nothing was half-written; the
retry went one table per migration, each confirmed before the next.

**`vantaca_audit` did not match on the first digest.** The import endpoint parses
its body with `JSON.parse`, so every Postgres `numeric` becomes a JavaScript
double on the way through, and a double does not carry scale. Four of the 21
costs came out a digit shorter: `0.0530 → 0.053`, `0.0640 → 0.064`,
`0.1600 → 0.16`, `0.0240 → 0.024`. The values are equal and no money is wrong,
but a verification that only passes when it feels like it is worse than none.
Restored with `round(cost_usd, 4)` — every source value is scale 4 — and the
digest then matched.

**This is a real limitation of the pg_net import route, not a one-off.** Any
`numeric` column moved this way loses its scale. The four content tables moved
earlier have no numeric columns, which is why their digests matched first time.

### Schema notes

SoFa keeps its foreign keys, which no other table in B does. They are kept
because SoFa relies on the behaviour and not merely the integrity: deleting an
event is supposed to take its flyers and nudges with it. Composite
`(tenant_id, x) → (tenant_id, id)` is the right form against a composite primary
key and makes a cross-tenant reference unrepresentable. `ON DELETE SET NULL`
names its column explicitly (PG15+), because the default would try to null
`tenant_id` as well.

Every UNIQUE gained `tenant_id` — `hebcal_key`, `dedupe_key` ×2. `hebcal_key`
matters most: the scan upserts on it, so a global unique would mean the first
tenant to record Erev Rosh Hashana 5786 owns that key and every other tenant's
scan quietly fails to write its own.

`vantaca_controls` is a singleton addressed as `.eq("id", 1)`; the composite key
makes that one row *per tenant*.

### The runtime

`sofa-jcc-scan` is deployed to B and **proved equivalent, not just deployed**: a
dry run on B returned byte-identical `location`, `shabbat`, `holidays`,
`summary`, `upserts`, `drafts` and `nudges` to A's dry run on the same day. Same
Pico-Robertson coordinates, same candle-lighting and havdalah times, same single
holiday in the window. The Hebcal location needed no secret — `DEFAULT_ZIP` is
baked into the pinned module.

Three changes beyond tenant-scoping:

- the upsert conflicts on `"tenant_id,hebcal_key"`, since the old single-column
  constraint no longer exists;
- `agentlogs` has no identity on `id` here, so the log line allocates one;
- **auth no longer fails open.** The original checked `SOFA_SCAN_SECRET` only
  when that variable was set, and it is not set in this project — the scan would
  have been a wide-open write endpoint. It now requires `CRON_SECRET`. Verified:
  no bearer and a wrong bearer both return 401.

It runs only for tenants with the `sofa_jcc` module enabled. That is not
bureaucracy: `planDay` derives its events from the Hebcal calendar rather than
from existing rows, so an un-opted-in tenant would not be skipped — it would be
filled with a shul calendar it never asked for.

`sofa_jcc` was turned on for the Mendy tenant in the same pass. The old database
has no `tenants` table, so the app treated every module as on there; this one
enables nine of ten, and `sofa_jcc` was the omission.

pg_cron job 7 on B runs it at 14:30 UTC. **A's job 5 is disabled, which leaves
database A with no active cron jobs at all.**

## Step 1 status, 2026-09-11

**Done:** `llm_messages`, `llm_conversations` and `static_pages` dropped from A in the
tracked migration `retire_multi_llm_playground_and_empty_static_pages`. Archived first to
`../ops/retired-2026-09-11/multi-llm-playground.md`. A is down from 52 tables to 49.
`llm-proxy` was deliberately left alone — VoiceView needs it.

**On hold:** `site_analyses`. I labelled it "Spectari" and it is not. It is the
**Voitra/Aventary homepage-analyzer lead-gen tool** — the rows are prospects (Ciocca
Cleaning, WNY Disaster Relief, Southeast Restoration, Kennedy Richter Construction,
Delta). Mendy's "we're done with that" was given against the wrong label, so it needs
re-confirming before 44 rows of prospect research are deleted.

Evidence that retiring it is safe, for when that call is made: not embedded on
aventary.com or voitra.ai (zero references in either page), not referenced anywhere in
the aventary repo, zero edge-function hits in 24h, and the last row was written
**2026-05-29** — 3½ months ago.

**Separately — dead config found on a live site.** `spectari.app` (the AI travel-glasses
rental business, unrelated to `site_analyses`) hardcodes A's URL and publishable key in
its page, but A has no Spectari tables left; they were removed 2026-08-21. Reservations
actually go to the Cloudflare Worker `spectari-reserve.mendyezagui.workers.dev`, so the
site works. The Supabase config in that page is vestigial and should be removed.

**Two edge functions now reference a dropped table:** `revops-dashboard` and
`update-page` both read `static_pages`. They served an empty page before and will error
now. The Supabase MCP has no delete-function tool, so they need removing from the
dashboard by hand.

## Decisions

| Group | Tables | Rows | Decision |
|---|---|---:|---|
| Resale scraper | `unclaimed_watchlist` | 2,918 | **Own project** — see below |
| Social / content ops | `contentCalendar`, `content_queue`, `socialCampaigns`, `socialStrategy` | 100 | ✅ **MOVED 2026-09-11** — copies still on A, see below |
| **Voitra site analyzer** | `site_analyses` | 44 | **KEEP — move to B**, becomes an Associate |
| Multi-LLM playground | `llm_messages`, `llm_conversations` | 41 | ✅ **DROPPED 2026-09-11** |
| Associates framework | `associates`, `associate_drafts`, `associate_runs` | 31 | ✅ **DONE 2026-09-11** — data and runtime on B, A's tables dropped |
| Vantaca / Scott Mgmt | `vantaca_audit`, `vantaca_controls` | 22 | **Move to B** |
| SoFa JCC | `sofa_events`, `sofa_nudges`, `sofa_flyers`, `sofa_work_orders`, `sofa_speakers` | 7 | **Move to B** |
| TalkBoard | `board_sets`, `children` | 2 | **Leave in A** — separate app, not CRM |
| Voitra gate | `voitra_gate_state` | 1 | **Do not touch** — working, leave as is |
| bp501 demo | `bp501_static` | 5 | **Leave in A** — decide later |
| Dead | `static_pages` | 1 | ✅ **DROPPED 2026-09-11** |
| Lead capture | `poc_leads`, `diagnostic_leads`, `secondbrain_waitlist`, `push_subscriptions` | 3 | **Move to B** — wired to live sites |

### `unclaimed_watchlist` — belongs in neither database

**VERIFIED:** no edge function on A touches it, and the Second Brain app never reads it
(it is not in the app's `DB_TABLES`). The only writer is a Claude Code routine that runs
daily — rows last written 05:33 UTC on 2026-09-11.

It is a refurb-electronics inventory scraper: Shopify-shaped rows (`handle`, `vendor`,
`product_type`, `price`, `available`), tagged `watch: electronics`. No reference to any
contact, company or deal.

Recommendation: give it its own small project and repoint the routine. Moving 2,918
product listings into a CRM tenant adds nothing and makes B's row counts misleading.

### What the four unknowns turned out to be

- **`board_sets` + `children`** — TalkBoard, the AAC app (talkboard-one.vercel.app).
  The single `children` row is "Mia". A live app, not junk; it just shares A's database.
- **`bp501_static`** — an HTML page stored as five base64 chunks, served by the
  `bp501-demo` and `bp501-publish` functions. A property/asset demo.
- **`static_pages`** — one row, slug `revops-dashboard`, `html` is zero bytes. Dead.
- **`voitra_gate_state`** — `state: auto`, served by `voitra-gate` / `voitra-admin`.
  Live and working. Leave alone.

---

## Per-group work, beyond copying rows

**Move to B** — each needs its edge functions redeployed against B and a `tenant_id`
column added to the table:

| Group | Functions to redeploy | App view |
|---|---|---|
| ~~Associates~~ | ~~`associate-tick`~~ — ✅ **done**: on B as cron job 5, A's job 6 disabled and A's tables dropped | `associates` |
| SoFa JCC | `sofa-jcc-scan` (runs ~hourly) | — |
| Vantaca | `rc-controls` and the `rc-*` set if they share config | `vantaca_controls` |
| Lead capture | `poc-lead-submit`, `voitra-poc-submit`, `retell-lead` | — |
| ~~Social / content~~ | none found — ✅ **data moved 2026-09-11** | `social`, `marketing` |

Lead capture is the one to be careful with: those endpoints are embedded in live
websites. Repoint the function, verify a test submission lands in B, and only then
remove the A-side table.

**Retire:**

- **Spectari** — `site_analyses` is served by `analyze-site`, `site-results` and
  `homepage-analyzer-widget`. Confirm the widget is not still embedded on a live page
  before dropping them; it is a homepage analyzer and may still be on aventary.com.
- **Multi-LLM** — drop `llm_messages`, `llm_conversations` and the `multi_llm` view.
  **Do not touch `llm-proxy`.** That is a different thing: VoiceView uses it for
  transcription, and killing it breaks voice capture.
- **`static_pages`** — empty, plus the `revops-dashboard` and `update-page` functions.

**Leave in A:** TalkBoard, bp501, the Voitra gate, and the watchlist until it gets its
own home. Which means:

> **A cannot be switched off.** After phase 2 it is no longer a CRM, but it remains the
> host for TalkBoard, the Voitra gate, the bp501 demo, and ~40 edge functions serving
> public URLs. The honest end state is "A stops being the CRM", not "A dies".

---

## Order

1. Confirm the Spectari widget is off a live page, then retire Spectari and multi-LLM.
   Lowest risk, clears 85 rows and two app tabs.
2. ~~Move social/content — no functions involved, pure data.~~ ✅ done 2026-09-11.
3. Move Associates, then SoFa JCC, then Vantaca. One at a time, redeploying the function
   and confirming a tick lands in B before removing the A-side table.
4. Move lead capture last, with a live test submission per endpoint.
5. Give the watchlist its own project and repoint the routine.
6. Then, and only then, close out the shared-table deltas in `second-brain-schema-gap.md`
   (`agentlogs` 735, `events` 142, `cadence_enrollments` 95, `payment_allocations` 30)
   and set A read-only for CRM purposes.
