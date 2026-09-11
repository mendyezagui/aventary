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

## Decisions

| Group | Tables | Rows | Decision |
|---|---|---:|---|
| Resale scraper | `unclaimed_watchlist` | 2,918 | **Own project** — see below |
| Social / content ops | `contentCalendar`, `content_queue`, `socialCampaigns`, `socialStrategy` | 100 | **Move to B** |
| Spectari | `site_analyses` | 44 | **Retire** |
| Multi-LLM playground | `llm_messages`, `llm_conversations` | 41 | **Retire** + drop the app tab |
| Associates framework | `associates`, `associate_drafts`, `associate_runs` | 31 | **Move to B** |
| Vantaca / Scott Mgmt | `vantaca_audit`, `vantaca_controls` | 22 | **Move to B** |
| SoFa JCC | `sofa_events`, `sofa_nudges`, `sofa_flyers`, `sofa_work_orders`, `sofa_speakers` | 7 | **Move to B** |
| TalkBoard | `board_sets`, `children` | 2 | **Leave in A** — separate app, not CRM |
| Voitra gate | `voitra_gate_state` | 1 | **Do not touch** — working, leave as is |
| bp501 demo | `bp501_static` | 5 | **Leave in A** — decide later |
| Dead | `static_pages` | 1 | **Retire** — the one row has 0 bytes of html |
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
