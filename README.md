# Aventary — self-hosted

Next.js 14 (App Router) + Supabase + Cloudflare Pages replacement for the
current Squarespace `aventary.com`. All content lives in Supabase so you can
edit from `/admin` without redeploying.

## Stack at a glance

- **Framework:** Next.js 14 App Router (React Server Components)
- **Styles:** Tailwind, Space Grotesk + Raleway (same as current site)
- **Database / CMS:** Supabase (Postgres + RLS)
- **Auth:** Supabase magic-link for `/admin`, gated by `ADMIN_EMAILS` allowlist
- **Forms:** `/api/contact` writes to `contact_submissions` and emails you via Resend
- **Hosting:** Cloudflare Pages (via `@cloudflare/next-on-pages`)
- **DNS:** Cloudflare

## Local dev

```bash
npm install
cp .env.example .env.local    # fill in the values, see "Supabase setup" below
npm run dev                   # http://localhost:3000
```

Without Supabase configured the public pages still render using the built-in
seed content (`lib/seed.ts`). The admin area and contact form need Supabase.

## Supabase setup

1. Create a project at https://supabase.com. Copy `URL`, `anon key`, and
   `service_role key` into `.env.local`.
2. Run the migrations:
   - **Option A (SQL editor):** paste `supabase/migrations/0001_init.sql` then
     `0002_seed.sql` into the Supabase SQL editor.
   - **Option B (CLI):** `supabase link --project-ref <ref>` then
     `supabase db push`.
3. In Supabase → Authentication → Providers, enable **Email** (magic link).
4. In Supabase → Authentication → URL Configuration, add:
   - Site URL: `https://www.aventary.com`
   - Additional redirect URLs: `https://www.aventary.com/admin`,
     `http://localhost:3000/admin`.
5. Add your email to the `admin_users` table and to `ADMIN_EMAILS` env var.

## Contact email (Resend)

1. Create a Resend account, verify the sending domain (`aventary.com`).
2. Put the API key in `RESEND_API_KEY`; set `CONTACT_FROM_EMAIL` to a verified
   address on that domain and `CONTACT_TO_EMAIL` to where leads should land.

## Git

```bash
cd aventary
git init && git add . && git commit -m "Initial import"
git branch -M main
git remote add origin git@github.com:<you>/aventary.git
git push -u origin main
```

## Deploy to Cloudflare Pages

1. In Cloudflare → Pages → **Create** → connect the GitHub repo.
2. Framework preset: **Next.js**. Build command: `npx @cloudflare/next-on-pages`.
   Output directory: `.vercel/output/static`.
3. Add env vars (Production **and** Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`
   - `ADMIN_EMAILS`
   - `NEXT_PUBLIC_SITE_URL=https://www.aventary.com`
4. Click deploy. First build will publish to `*.pages.dev`. Verify the site
   works on that URL.

## DNS cutover (Squarespace → Cloudflare)

*Do this only after the Cloudflare Pages preview URL looks correct.*

1. Move the `aventary.com` domain into Cloudflare (Cloudflare → **Add site**,
   follow the DNS import). Do **not** flip nameservers yet if you already have
   Cloudflare.
2. In Cloudflare → Pages → your project → **Custom domains**, add
   `aventary.com` and `www.aventary.com`. Cloudflare will create the CNAME
   records automatically — accept them.
3. If you're switching registrars/nameservers from Squarespace, change the
   nameservers at your registrar to the two Cloudflare gave you. Propagation
   is usually under an hour.
4. Log into Squarespace → Settings → Billing → cancel the subscription
   *after* `www.aventary.com` is serving from Cloudflare (check with
   `dig www.aventary.com` or https://dnschecker.org).

## Video

Clips live in the `videos` table and are edited at `/admin/videos`. Run
`supabase/migrations/0005_videos.sql` before using it.

Three surfaces, one data source:

| URL | What it is | Indexed |
| --- | --- | --- |
| `/videos` | The crawlable grid. Links to every watch page. | yes |
| `/videos/<slug>` | One clip, server-rendered, with its transcript in the HTML and `VideoObject` structured data. | yes — this is the surface that earns search traffic |
| `/videos/feed` | The phone scroll feed. A view over the same rows. | no (`noindex, follow`) |

Why it's split that way: Google does not scroll. A feed is one URL with one
video on it as far as a crawler is concerned, so the feed alone would get you
nothing. Video results need a dedicated page per clip, server-rendered, with a
thumbnail and structured data. The feed is the retention layer on top.

**The transcript is the product.** AI answer engines don't watch video, they
read text, and `app/robots.ts` already lets them read the marketing pages. A
clip without a transcript is invisible to them. The admin editor lists what's
missing on each clip before you publish it.

### Hosting a clip

`provider` picks how a clip is played:

- **`cloudflare_stream`** — the default and the recommended one. `playback_id`
  is the Stream video UID. Autoplays in the feed, auto-generates captions you
  can paste into the transcript field, and the video is served from our own
  domain so the indexing credit lands here.
  Set `NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` to the first label of your
  `customer-<code>.cloudflarestream.com` hostname; without it, URLs fall back to
  `videodelivery.net`.
- **`file`** — `source_url` points at an `.mp4` or `.m3u8` anywhere. Autoplays in
  the feed. You must supply `thumbnail_url` yourself; there is nothing to derive
  one from.
- **`youtube`** — `playback_id` is the YouTube video ID. The watch page works,
  but the clip can't autoplay in the feed (a third-party iframe needs a tap) and
  Google credits the video itself to youtube.com. Use it to get a back catalogue
  up quickly, not as the destination.

A clip **needs a thumbnail**. Google treats it as required on both the
structured data and the video sitemap, so a clip without one is dropped from
both silently. Stream and YouTube clips derive one automatically; `file` clips
don't.

### Sitemaps

`/sitemap.xml` lists the watch pages as ordinary pages. `/video-sitemap.xml`
lists them again with the `video:` namespace Google needs. Both are announced in
`robots.txt` — submit both in Search Console.

### Chapters

Long clips can take chapters, authored as `0:00 Title` lines. Each runs until
the next one starts, and they become `Clip` structured data, which is what
produces the "Key moments" jump-links under a Google video result. Worth doing
on long form, skip on shorts.

## Admin

- Go to `/admin/login`, enter your allowlisted email, click the magic link.
- **Pages:** edit hero/services/cta/rich_text blocks as JSON. Changes show up
  on the site within 60s (ISR `revalidate = 60`).
- **Submissions:** contact-form entries (last 200).

## What's intentionally out of scope

- Image uploads for the CMS — add Supabase Storage later when you need it.
- Multi-user accounts — only the email allowlist is gated.
- Redirects from Squarespace-specific URLs — your sitemap is already /home,
  /about, /contact, /appointments, /insights, /insights/:slug, which match.


<!-- Note: NEXT_PUBLIC_* env vars are inlined at build time. After changing them in Cloudflare, trigger a rebuild. -->
