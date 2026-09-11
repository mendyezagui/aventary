# Second Brain — which database is which, and who writes to it

**Last verified:** 2026-09-11. Everything marked **VERIFIED** was checked directly
against the live systems on that date. **INFERRED** was not — confirm before acting.

This file exists because a proposal page was built in this repo (`/c/<slug>`, see
`docs/client-pages.md`) without anyone checking that a client-page system already
existed elsewhere. It did. Read this before building anything that touches Second
Brain data or publishes a client document.

---

## The short version

There is no accidental fork. There are **two deliberate instances of the same app**
— a personal one and a multi-tenant product one — each with its own database. The
bug is that the **tooling and the automation point at different ones**, and nobody
wrote that down.

| | **A — personal** | **B — product** |
|---|---|---|
| Supabase project | `xwacfwagyhgbbhefecdt` ("Second Brain") | `fukehjqikxqsntwhmgsk` |
| Supabase org | `olgldqiwtbuuwlwatwaq` | **not in that org** — separate account |
| Multi-tenant | no `tenant_id` column | every row has `tenant_id` |
| Reached by | the **Supabase** MCP connector | the **`2nd_Brain`** MCP connector |
| App host | the personal Vercel deploy | `secondbrain-app.pages.dev`, `os.aventary.com` |
| Written by | all the automation (Apollo loops, gmail-triage, Claude sessions) | the product app, and the `2nd_Brain` connector |

**C — `uclyawqdeabjsrejfdlw` ("aventary")** is the website's database. No CRM tables.
It holds the access control for this repo's `/c/<slug>` pages.

---

## How the app picks a database — VERIFIED

`mendyezagui/second-brain` is env-driven (`VITE_SUPABASE_URL`), and hardcodes a
host test for the product instance (`src/lib/utils.js`, `src/views/VoiceView.jsx`):

```js
const IS_PRODUCT_HOST = /(^|\.)secondbrain-app\.pages\.dev$|(^|\.)os\.aventary\.com$/
  .test(window.location.host);
```

Product host → `fukehjqikxqsntwhmgsk` (B). Anything else → `xwacfwagyhgbbhefecdt` (A).
`src/lib/supabase.js` also probes for a `tenants` table and treats its absence as
"single-tenant / owner", which is what A is.

## The `2nd_Brain` connector points at B, and its repo says otherwise — VERIFIED

`mendyezagui/second-brain-mcp`'s README states it "talks to Supabase project
`xwacfwagyhgbbhefecdt`". That is **wrong for the live connector**: the data it
returns carries `tenant_id`, has `client_slug`/`public_enabled`/`public_meta` on
`projects`, and has no `files` column — none of which is true of A's `public` schema
(checked: A has exactly one `projects` table, in `public`, with 17 rows and no
`tenant_id`).

The live connector is also **not this repo at HEAD**: it exposes 11 allowed tables
(no `agentlogs`, `invoices`, `company_news`, `calendar_events`) and no `run_sql`,
against the repo's 15 and `run_sql`/`apply_migration`. The real target is the
Worker's `SUPABASE_URL` secret, which is not in the repo.

**Consequence:** a Claude session using the `2nd_Brain` connector and a Claude
session using the Supabase connector are writing to two different CRMs.

## The divergence is active, not historical — VERIFIED

B was seeded from a copy of A on **2026-08-13** (a large block of rows share
`modified_at = 2026-08-13T21:50:14.843`). Since then:

- **Tasks only ever land in A.** A: 444 rows, max id 489, last write 2026-09-11.
  B: max id **393**, last write **2026-08-13** — the import timestamp. Every task
  gmail-triage has created since the fork exists in A alone.
- **Contacts split.** A has 375 rows to id 384; B stops at 208. A's 208–384 were
  written by Apollo loops that only know about A.
- **The same record gets written to both, with different ids.** Prime Rock Realty
  was entered on 2026-09-11 into **both**:

  | | A | B |
  |---|---|---|
  | company | 172 | 135 |
  | contact (Micah Hiller) | 384 | 208 |
  | project | 10011 | 10012 |

- **Two id collisions on `projects` now, not one:**

  | id | in A | in B |
  |---|---|---|
  | 10010 | Cheder Menachem — Graphite replacement | Rambam 30-Day Leaderboard |
  | 10011 | Prime Rock Realty — Broker Operator System | Brown Bag Direct — Discovery Engagement |

Because ids collide, **A and B cannot be naively merged.** Any consolidation needs
an explicit old-id → new-id map with every foreign key rewritten (`companyId`,
`contactId`, `projectId`, `dealId`, `referredBy`, `strategyId`), and it must be
reversible.

---

## Two client-page systems

### System 1 — a project row is the page (in B)

- `projects.client_slug`, `projects.public_enabled`, `projects.public_meta`, plus a
  `project_blocks` table (`project_id`, `tab`, `title`, `body`, `format`, `sort`).
- Edited from the product app (`secondbrain-app.pages.dev` / `os.aventary.com`).
  Not present in `mendyezagui/second-brain` at HEAD — the product build is elsewhere.
- Served by a Supabase Edge Function on B: `/functions/v1/client-page?slug=<slug>`.
- **It has no access control at all — VERIFIED.** That endpoint returns the full
  document as JSON to an unauthenticated request with no `apikey` header. The only
  protection is that the slug has to be guessed; a wrong slug 404s.
- Live example: project 10011 in B, `client_slug: "bbdc"`, `public_enabled: true`.

### System 2 — `/c/<slug>` in this repo

- Content in `content/clients/<slug>.ts`, registered in `content/clients/index.ts`.
  Access control in **C** (`client_pages`, `client_page_tokens`,
  `client_page_sessions`, `client_page_questions`). See `docs/client-pages.md`.
- Gated: single-use emailed sign-in link (20-min expiry) or a shared password
  (PBKDF2-SHA256), 30-day scoped sessions, per-page allowlist.

### They share nothing, and `bbdc` is now in both

`grep -rn "client_slug\|public_enabled\|public_meta"` in this repo returns zero
matches. As of 2026-09-11 the Brown Bag Direct proposal exists **twice**: gated at
`aventary.com/c/bbdc`, and publicly readable from the System 1 edge function.

---

## The rules

1. **Before publishing a client document, pick one system.** Two systems that
   produce a similar-looking artifact is the same class of mistake as two CRMs,
   one layer up. If the document is confidential, System 1 is not an option as it
   stands — "public_enabled" means public.
2. **Never assume a connector's name tells you its database.** `2nd_Brain` and
   `Supabase` both claim to be Second Brain and are not the same store. Verify by
   writing a record through one and reading it back through the other.
3. **Don't consolidate A and B before finding every writer.** Automation still
   pointed at the loser will re-split it within a day — it already has.
4. **Colliding ids mean the merge is not a merge.** Mapped migration, foreign-key
   rewrites, reversible, both sides backed up first.
5. **Bulk-identical `modified_at` values are a migration fingerprint**, not a bug.

## Still open

- **Is A or B canonical — or are they meant to stay separate?** Only Mendy can
  decide. If they stay separate, the fix is not a migration: it is pointing the
  `2nd_Brain` connector at A (or making the choice explicit per session) and
  correcting the `second-brain-mcp` README.
- The `second-brain-mcp` Worker's deployed source is not this repo at HEAD. Find
  what is deployed before changing it.
- A row-level A/B audit (rows only in A, only in B, differing, colliding) has not
  been produced. It is only worth producing if a merge is actually the plan.
