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
