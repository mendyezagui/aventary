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
| `donate.html` | `/donate` | Embedded **Zeffy** donation form (auto tax receipts) + in-kind wishlist |
| `good-deeds.html` | `/good-deeds` | "Join the Good Deeds Chain" — **self-hosted** form + live chain (Cloudflare D1) |
| `moderate.html` | `/moderate` | Hidden, `noindex` moderation dashboard for the Good Deeds queue |
| `404.html` | any unknown path | Friendly not-found page |

`/` redirects to `/home` (301), matching the current site.

## Good Deeds backend (self-hosted on Cloudflare)

The Good Deeds Chain no longer depends on Google Apps Script. It runs entirely
on Cloudflare infrastructure we control:

- **Database:** Cloudflare **D1** (SQLite). Database name `sofajcc-deeds`, schema
  in [`schema.sql`](schema.sql). Bound to the Pages project as `DB`.
- **API:** Cloudflare **Pages Functions** in [`functions/`](functions/):
  - `GET /api/good-deeds` — returns approved deeds (newest first).
  - `POST /api/good-deeds` — submits a deed as `pending`. Has a hidden honeypot
    field and per-IP-hash rate limiting (IPs are stored only as salted SHA-256
    hashes, never in the clear).
  - `GET|POST /api/admin/good-deeds` — moderation (approve / reject / delete),
    protected by a bearer token.
- **Moderation:** open `/moderate`, paste the admin token, and approve/reject the
  pending queue. Submissions are **never public until approved.**

### Secrets (Pages project → Settings → Variables and Secrets, production)

| Name | Purpose |
|------|---------|
| `ADMIN_TOKEN` | Bearer token for `/moderate` and the admin API. |
| `DEEDS_SALT`  | Salt for hashing submitter IPs (rate limiting). |

These live **only** as encrypted Pages env vars — never in the repo. To rotate
the admin token: set a new `ADMIN_TOKEN` secret in the dashboard (or via the
Pages API), redeploy, and use the new value at `/moderate`.

### One-time setup (already done, for reference)

```bash
export CLOUDFLARE_API_TOKEN=...   # D1:Edit + Pages:Edit
export CLOUDFLARE_ACCOUNT_ID=3ce1454beb9c83c90403c54e0855e4f9
wrangler d1 create sofajcc-deeds
wrangler d1 execute sofajcc-deeds --remote --file=schema.sql
# then bind DB → the new database_id and set ADMIN_TOKEN / DEEDS_SALT
# on the Pages project's production config, and deploy.
```

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

Because the site now includes Pages Functions and must NOT publish build/config
files, **always deploy with the provided script**, which assembles a clean
publish directory first:

### Option A — `./publish.sh` (recommended)

```bash
export CLOUDFLARE_API_TOKEN=...      # Pages:Edit (+ D1:Edit for db changes)
export CLOUDFLARE_ACCOUNT_ID=3ce1454beb9c83c90403c54e0855e4f9
./publish.sh
```

This builds the CSS, copies only publishable files into `.pages-dist/`
(HTML, `assets/`, `functions/`, `_headers`, `_redirects`, `robots.txt`,
`sitemap.xml`), and runs `wrangler pages deploy .pages-dist`.

> ⚠️ **Do not run `wrangler pages deploy .` on the source folder.** Cloudflare
> Pages ignores `.assetsignore`, so a raw deploy would publicly serve
> `package.json`, `tailwind.config.js`, `schema.sql`, and any local `*.env`
> file. `publish.sh` exists precisely to prevent that.

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
- **Donations** — embedded **Zeffy** donation form
  (`https://www.zeffy.com/embed/donation-form/donate-807`) in `donate.html`, with
  a direct-link fallback. Zeffy is free for the nonprofit (100% of the gift
  reaches the org) and emails donors an automatic tax receipt. Manage the form,
  amounts, and receipts in the Zeffy dashboard. (Replaced the previous Stripe
  Buy Button.)
- **Good Deeds chain** — self-hosted on Cloudflare D1 + Pages Functions (see the
  "Good Deeds backend" section above). Moderate submissions at `/moderate`.
- **Branding** — the logo is an inline SVG (a sofa mark) in each page's header
  and in `assets/favicon.svg` / `assets/og.svg`. Swap in a real logo image any
  time by replacing those references.

## What changed from Google Sites

- Fixed two typos in the hero copy ("Commuity" → "Community", "Frienship" →
  "Friendship").
- Replaced Google-hosted decorative images with clean, owned CSS/SVG branding so
  the site is fast and has no external image dependencies. Drop in real photos
  whenever you'd like.
