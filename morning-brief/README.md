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
wrangler kv:namespace create BRIEF_KV
```
Copy the `id` it returns. Paste it into `wrangler.toml` replacing `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

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

## Step 6 — Embed on aventary.com
1. Open `embed-widget.html`
2. Update `API_URL` at the top of the `<script>` block with your actual Worker URL
3. Copy the entire file contents into your Cloudflare Pages site
   - OR copy just the `<div id="morning-brief">` and `<script>` block into an existing page

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
| `WEB_SEARCH_MAX_USES` | `worker.js` const | `30` | Hard cap on billable searches per run (~$0.30/run at $10/1k) |
| Idempotency check | `/api/trigger` | on | Refuses re-runs once today's brief exists |
| `compatibility_date` cache | `fetchFeed()` | 30 min | Edge-caches feed XML — repeat runs same day are free |
| Model | `runAgentLoop()` | `claude-sonnet-4-6` | Drop to `claude-haiku-4-5` for ~70% lower token cost (noisier picks) |
