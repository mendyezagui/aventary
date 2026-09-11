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
| Social / content ops | `contentCalendar`, `content_queue`, `socialCampaigns`, `socialStrategy` | 100 | **Move to B** |
| **Voitra site analyzer** | `site_analyses` | 44 | **KEEP — move to B**, becomes an Associate |
| Multi-LLM playground | `llm_messages`, `llm_conversations` | 41 | ✅ **DROPPED 2026-09-11** |
| Associates framework | `associates`, `associate_drafts`, `associate_runs` | 31 | **Move to B** — schema created 2026-09-11 |
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
| Associates | `associate-tick` (runs ~hourly) | `associates` |
| SoFa JCC | `sofa-jcc-scan` (runs ~hourly) | — |
| Vantaca | `rc-controls` and the `rc-*` set if they share config | `vantaca_controls` |
| Lead capture | `poc-lead-submit`, `voitra-poc-submit`, `retell-lead` | — |
| Social / content | none found | `social`, `marketing` |

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
2. Move social/content — no functions involved, pure data.
3. Move Associates, then SoFa JCC, then Vantaca. One at a time, redeploying the function
   and confirming a tick lands in B before removing the A-side table.
4. Move lead capture last, with a live test submission per endpoint.
5. Give the watchlist its own project and repoint the routine.
6. Then, and only then, close out the shared-table deltas in `second-brain-schema-gap.md`
   (`agentlogs` 735, `events` 142, `cadence_enrollments` 95, `payment_allocations` 30)
   and set A read-only for CRM purposes.
