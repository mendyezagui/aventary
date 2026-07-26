# SoFa Jewish Community Center — sofajcc.org

A simple, fast, self-contained **static website** for the SoFa Jewish Community
Center (Chabad), rebuilt from the current Google Sites site and ready to host on
**Cloudflare Pages**. No build step, no framework, no server — just HTML, CSS,
and a little JavaScript.

The content, page titles, meta descriptions, and URL structure were copied from
the live Google Sites site so **existing search traffic and rankings are
preserved** during the move.

## Pages

| File | Serves at | Notes |
|------|-----------|-------|
| `home.html` | `/home` | Welcome, programs, weekly Dvar Torah (embedded Google Doc) |
| `about.html` | `/about` | Mission, vision, embedded **Contact Us** Google Form (`#contact`) |
| `donate.html` | `/donate` | Live **Stripe** donation button (carried over unchanged) |
| `good-deeds.html` | `/good-deeds` | "Join the Good Deeds Chain" (Google Apps Script) |
| `404.html` | any unknown path | Friendly not-found page |

`/` redirects to `/home` (301), matching the current site.

## Preview locally

No tooling required — just serve the folder:

```bash
cd sofajcc
python3 -m http.server 8099
# open http://127.0.0.1:8099/home.html
```

(The Google Doc / Form / Stripe embeds only load over a real https domain, so
some panels look empty on `localhost` — that's expected.)

## Deploy to Cloudflare Pages

This site is a static folder. Two ways to publish it:

### Option A — Wrangler (fastest, direct upload)

```bash
npm install -g wrangler        # if you don't have it
wrangler login
wrangler pages project create sofajcc --production-branch main
wrangler pages deploy sofajcc --project-name sofajcc
```

Cloudflare gives you a `https://sofajcc.pages.dev` URL. Open it and click
through every page **before** touching DNS.

### Option B — Connect the GitHub repo (auto-deploy on push)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick this repo.
2. Build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `sofajcc`
   - **Root directory:** *(leave as repo root)*
3. **Save and Deploy.** Every push to the branch redeploys automatically.

> This `sofajcc/` folder is deliberately self-contained so it deploys as its own
> Cloudflare Pages project, independent of the rest of this repository.

## Point sofajcc.org at Cloudflare (DNS cutover from Google Sites)

Do this **only after** the `*.pages.dev` preview looks correct.

1. **Add the domain to Cloudflare** (if it isn't already): Cloudflare → **Add a
   site** → `sofajcc.org` → follow the DNS import, then set the two Cloudflare
   nameservers at your registrar (e.g. Google Domains / Squarespace Domains).
2. In your Pages project → **Custom domains** → add both:
   - `www.sofajcc.org`  ← primary / canonical
   - `sofajcc.org`
   Cloudflare creates the DNS records automatically — accept them.
3. Remove the old Google Sites verification / mapping records for
   `sofajcc.org` and `www.sofajcc.org` so they no longer point to Google.
4. Set a redirect so the apex sends to `www` (matches today's setup): Cloudflare
   → your domain → **Rules → Redirect Rules** → *If hostname equals
   `sofajcc.org` → 301 to `https://www.sofajcc.org/$1`* (or use a Bulk Redirect).
5. Verify with `dig www.sofajcc.org` or https://dnschecker.org. Propagation is
   usually well under an hour.
6. Once `www.sofajcc.org` serves from Cloudflare, you can unpublish the Google
   Sites site.

## Keep your SEO / traffic

Already handled in the files:

- ✅ Same page paths (`/home`, `/about`, `/donate`, `/good-deeds`) — no broken links.
- ✅ Same `<title>` tags and canonical URLs on `www.sofajcc.org`.
- ✅ `sitemap.xml`, `robots.txt`, Open Graph + Twitter cards, JSON-LD structured data.
- ✅ `/` → `/home` 301 redirect (unchanged behavior).

After the cutover:

1. In **Google Search Console**, confirm the `sofajcc.org` property, then submit
   `https://www.sofajcc.org/sitemap.xml`.
2. Use **URL Inspection** → *Request indexing* on `/home` to prompt a re-crawl.
3. If you ever rename a page, add a `301` line to `_redirects` so the old URL
   still resolves — never let an indexed URL 404.

## Editing content later

Everything is plain HTML — open the file and edit the text. The dynamic pieces
are wired to your existing Google/Stripe accounts, so they update on their own:

- **Weekly Dvar Torah** — updates automatically; it embeds your Google Doc
  (`docs.google.com/document/d/1khotQ-cPlYrS90Bp4ns1PhuWbHrbEWAib1o7b-3ud50`).
  Edit that doc and the site reflects it.
- **Contact form** — embeds your Google Form; responses go to your Google account.
- **Donation button** — the Stripe Buy Button
  (`buy_btn_1Tb1mgLMjVclDp8Qk5BUfjEb`). Manage amounts/receipts in Stripe.
  *Note: the publishable key and button id in `donate.html` are public by design
  — Stripe intends them to live in client-side HTML.*
- **Good Deeds chain** — embeds your Apps Script web app.
- **Branding** — the logo is an inline SVG (a sofa mark) in each page's header
  and in `assets/favicon.svg` / `assets/og.svg`. Swap in a real logo image any
  time by replacing those references.

## What changed from Google Sites

- Fixed two typos in the hero copy ("Commuity" → "Community", "Frienship" →
  "Friendship").
- Replaced Google-hosted decorative images with clean, owned CSS/SVG branding so
  the site is fast and has no external image dependencies. Drop in real photos
  whenever you'd like.
