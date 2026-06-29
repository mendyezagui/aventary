# Morning Brief — Deployment Guide
## aventary.com · Cloudflare Worker · 6 AM PST Daily

---

## What this does
- Cloudflare Worker fires at 6 AM PST via Cron Trigger
- Scans 30 voices across X, LinkedIn, Substack, YouTube, blogs
- Anthropic AI ranks results → surfaces top 5 most materially valuable pieces
- Stores in Cloudflare KV (48hr TTL)
- embed-widget.html fetches and renders on any page of aventary.com

---

## Step 1 — Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

---

## Step 2 — Create KV Namespace
```bash
wrangler kv namespace create BRIEF_KV
```
Copy the `id` it returns. Paste it into `wrangler.toml` replacing `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

> Note: Wrangler v2 used `wrangler kv:namespace create BRIEF_KV` (with a colon).
> v3+ dropped the colon — use a space.

---

## Step 3 — Set Secrets
```bash
wrangler secret put ANTHROPIC_API_KEY
# Paste your Anthropic API key when prompted

wrangler secret put TRIGGER_SECRET
# Type any random string (e.g. a UUID) — used to manually trigger generation
```

---

## Step 4 — Deploy
```bash
wrangler deploy
```
Your Worker URL will be: `https://morning-brief.YOUR_ACCOUNT.workers.dev`

---

## Step 5 — Test manually
```bash
curl -X POST https://morning-brief.YOUR_ACCOUNT.workers.dev/api/trigger \
  -H "Authorization: Bearer YOUR_TRIGGER_SECRET"
```
Wait ~60–90 seconds for the brief to generate. Then:
```bash
curl https://morning-brief.YOUR_ACCOUNT.workers.dev/api/morning-brief
```
You should see JSON with `top5` array.

---

## Step 6 — Mount on aventary.com/intelligence (recommended)

The Next.js page lives at `app/(site)/intelligence/page.tsx` and renders
`components/MorningBrief.tsx`, which fetches `/api/morning-brief` same-origin.
For that fetch to work, the Worker has to be mounted under `aventary.com`
via a Workers Route (already declared in `wrangler.toml`).

Prereqs:
- `aventary.com` is on a Cloudflare zone you control (Pages requires this too)
- The main aventary Pages site is already deployed

Steps:
1. Confirm DNS: `dig aventary.com NS` should return Cloudflare nameservers
2. Deploy the Worker — `wrangler deploy` reads `wrangler.toml` and creates
   the routes `aventary.com/api/morning-brief` and `aventary.com/api/trigger`
3. Verify the routes registered: Cloudflare dashboard → Workers & Pages →
   morning-brief → Triggers → Routes
4. Hit `https://aventary.com/api/morning-brief` directly — should return JSON
   (or `{status: "pending"}` if no brief has been generated yet)
5. Visit `https://aventary.com/intelligence` — page renders, fetches the brief

Routing precedence: a Workers Route on a zone takes priority over a Pages
project on the same hostname. So adding `/api/morning-brief` and `/api/trigger`
as Worker routes hijacks those two specific paths only. Everything else
(including `/api/contact` and `/intelligence`) keeps serving from Pages.

## Legacy: embed-widget.html (one-page embed, no routing)

If you'd rather not mount the Worker under your domain (or you want to
embed the brief on a non-aventary page), use `embed-widget.html`:
1. Open the file
2. Replace `API_URL` with your `*.workers.dev` URL
3. Paste the file into any page

---

## Cron Schedule
| Time Zone | Cron | wrangler.toml setting |
|-----------|------|-----------------------|
| 6 AM PDT (Apr–Oct) | 13:00 UTC | `"0 13 * * *"` |
| 6 AM PST (Nov–Mar) | 14:00 UTC | `"0 14 * * *"` |

Currently set to `"0 13 * * *"` (PDT/summer). Update in `wrangler.toml` each November and re-deploy.

---

## Manual trigger (anytime)
```bash
curl -X POST https://morning-brief.YOUR_ACCOUNT.workers.dev/api/trigger \
  -H "Authorization: Bearer YOUR_TRIGGER_SECRET"
```

---

## Files
| File | Purpose |
|------|---------|
| `worker.js` | Cloudflare Worker — cron + API handler |
| `wrangler.toml` | Cloudflare config — cron schedule, KV binding |
| `embed-widget.html` | Frontend — paste into aventary.com |
| `README.md` | This file |

---

## Updating voices
Edit the `VOICES` array at the top of `worker.js`, then re-deploy:
```bash
wrangler deploy
```
No KV or secret changes needed.

---

## RSS prefetch (Substack + YouTube)

Each `VOICES` entry has two optional fields:

```js
substack: "https://example.substack.com/feed"   // or null
youtube_channel_id: "UCxxxxxxxxxxxxxxxxxx"      // 22-char ID, or null
```

When set, the Worker fetches that feed directly and uses items as candidates
before falling back to `web_search` for X/LinkedIn. This cuts billable
search volume roughly in half.

**Finding YouTube channel IDs:**
1. Open the channel page
2. View source (Cmd+U)
3. Grep for `"channelId"` — value starts with `UC`

**Finding Substack URLs:**
- Substacks: `https://PUBLICATION.substack.com/feed`
- Custom domains / Ghost / Wordpress: append `/feed` or `/rss` to the site
- Verify with `curl -I <url>` — 200 means a feed exists

Leave both fields as `null` for voices that publish only on X/LinkedIn.

---

## Dedup & idempotency

The Worker uses three KV keys to avoid re-surfacing items and double-spending:

| Key | Purpose | TTL |
|---|---|---|
| `latest` | Most recent brief JSON | 48h |
| `last_run_at` | ISO timestamp of last successful brief; RSS filter starts from `last_run - 6h` | none (overwritten) |
| `shown:<sha1(url)>` | Marker that this URL appeared in a prior brief | 14d |

**Idempotency:** `POST /api/trigger` returns `409 skipped` if today's brief
already exists. Append `?force=1` to override:

```bash
curl -X POST 'https://morning-brief.YOUR_ACCOUNT.workers.dev/api/trigger?force=1' \
  -H "Authorization: Bearer YOUR_TRIGGER_SECRET"
```

---

## Cost controls

| Knob | Where | Default | Effect |
|---|---|---|---|
| `WEB_SEARCH_MAX_USES` | `worker.js` const | `10` | Hard cap on billable searches per run (~$0.10/run at $10/1k). Sized for the ~4 feedless voices now in PART B; raise it only if you re-broaden the search scope. |
| Prompt caching | `runAgentLoop()` | on | The large initial prompt is pinned with a `cache_control` breakpoint, so each `pause_turn` continuation re-reads it at ~0.1x input price instead of full price. Pure win across the multi-turn agentic loop. |
| Web search tool | `runAgentLoop()` | `web_search_20260209` | Dynamic filtering — search results are filtered before entering context, cutting input tokens and improving picks vs. the basic `web_search_20250305`. |
| Idempotency check | `/api/trigger` | on | Refuses re-runs once today's brief exists |
| `compatibility_date` cache | `fetchFeed()` | 30 min | Edge-caches feed XML — repeat runs same day are free |
| Model | `runAgentLoop()` | `claude-sonnet-4-6` | Drop to `claude-haiku-4-5` for ~67% lower token cost (noisier picks) |
| Search scope | `generateBrief()` prompt PART B | feedless voices only | PART B only lists voices with no RSS feed (computed from `VOICES`); feed-covered voices are already in PART A, so they aren't re-searched. This is the single biggest search-cost cut. Trade-off: X/LinkedIn-only posts from feed-covered voices are no longer surfaced. To re-broaden, list all of `VOICES` in PART B and raise `WEB_SEARCH_MAX_USES`. |
