# Two front ends, and which one is live — 2026-09-14

Settled by reading both repositories, after `secondbrain-app` was transferred into the
`mendyezagui` account and could finally be attached to a session.

## The live app is `mendyezagui/secondbrain-app`

Three independent checks, all agreeing:

| | Live bundle `index-BYYmilmv.js` | `secondbrain-app` | `second-brain` |
|---|---|---|---|
| `IS_PRODUCT_HOST` | `…\|(^\|\.)aventary\.com$` | **same** | `os.aventary.com` |
| Browser Supabase clients | 2 | **2** (`supabase`, `vantacaDb`) | 1 |
| Second client's target | `xwacfwagyhgbbhefecdt` | **same**, `src/lib/supabase.js:21` | absent |

`src/lib/utils.js:33` in `secondbrain-app`:

```js
const IS_PRODUCT_HOST = typeof window !== "undefined" && /(^|\.)secondbrain-app\.pages\.dev$|(^|\.)aventary\.com$/.test(window.location.host);
```

That is the live bundle's line exactly. `second-brain` has never contained it, in any of its
284 commits.

## It contains no SoFa at all

No `SofaJCCView.jsx`, no `SofaDevView.jsx`, no `src/lib/sofa/`, zero occurrences of
`SoFa JCC Associate`. So no amount of rebuilding or redeploying the live app would ever have
shown the SoFa associates — they are not in the codebase that is live.

## They are siblings, not a fork

- `secondbrain-app` first commit: **2026-08-12**, "Initial commit: multi-tenant Second Brain
  OS product build"
- `second-brain` first commit: 2026-03-13
- **Zero shared commit SHAs.** Four shared commit *subjects*, which is work copied across by
  hand rather than shared history.

**2026-08-12 is also the day Supabase project B (`secondbrain-os`) was created.** The product
was split out of the personal app in a single day — new repository, new database, no shared
history with either predecessor. Every divergence untangled this week traces back to it.

## Neither is a superset

| Only in `secondbrain-app` (live) | Only in `second-brain` |
|---|---|
| `ClientHub.jsx` | `SofaJCCView.jsx` |
| `ConnectionsView.jsx` | `SofaDevView.jsx` |
| `CustomerUsageView.jsx` | `SpectariInventoryView.jsx` |

Both have 34 views. The product half has the multi-tenant work; the personal half has SoFa
and Spectari.

## The headline

`2nd.mendyezagui.com` is a custom domain on the `secondbrain-app` Pages project. The personal
repository has **no deployment of its own at all**. So everything committed to
`mendyezagui/second-brain` since 2026-08-12 — SoFa, Spectari, PRs #2 through #14 — has never
been live anywhere, and could not have been.

## What this nearly cost

The walkthrough written earlier would have connected the `secondbrain-app` Pages project to
`mendyezagui/second-brain`. That would have replaced the live multi-tenant product with the
personal app: Client Hub, Connections and Customer Usage gone from a product other tenants
use, in exchange for SoFa. It was one dashboard visit away, and it was caught only because
Mendy said "there's a whole separate repo".

## Other findings

- `secondbrain-app` is clean: 69 tracked files, no `node_modules`, no `dist`.
- It has **no** `.github/workflows` and **no** `wrangler.toml`, so it is also deployed by hand.
  Neither repository has ever had automated deployment.
- It references B twice and A four times. The A references are Voitra gate/admin, `llm-proxy`,
  and the `vantacaDb` client — the same Vantaca split found in the live bundle.
- Its `AssociatesView` also renders a hardcoded `ASSOCIATES` array from `src/lib/constants.js`
  rather than reading the `associates` table. Both front ends have that split.

## The decision this leaves

Is there one product or two? Right now the personal app has no deployment and the product has
no SoFa. Three honest options:

1. **Port SoFa into `secondbrain-app`** — three views plus `src/lib/sofa/` — and retire
   `second-brain`. One codebase.
2. **Give `second-brain` its own Pages project and domain.** Two products, deliberately, with
   the split written down.
3. **Merge both ways into one repo.** Most work, and the only option where nothing is lost or
   duplicated.

None of the database work is affected. The CRM lives in B, the live product points at B, and
the associates, content, SoFa and Vantaca tables moved there this week are all where they
should be regardless of which front end wins.
