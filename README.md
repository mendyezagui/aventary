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


## Carpool (`/carpool`)

A standalone installable web app for a school carpool: parents sign in, the
person driving shares their live position, and everyone else sees the car move
and gets a notification about a minute before it reaches their door.

**Setup**

1. Run `supabase/migrations/0003_carpool.sql` (`supabase db push`, or paste it
   into the SQL editor). It creates the tables, the RLS policies, the
   join-by-code RPCs, and adds the live tables to the `supabase_realtime`
   publication.
2. Generate push keys — `npx web-push generate-vapid-keys` — and set
   `VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value),
   `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`. Without them the app still works;
   pings just appear in-app instead of on the lock screen.
3. Confirm Supabase Auth has email magic links enabled and that
   `https://aventary.com/auth/callback` is an allowed redirect URL.
4. First parent opens `/carpool`, signs in, and taps **Start a new one**. The
   six-character join code it hands back is what everyone else enters.

**How it fits together**

- `app/carpool/*` — the client app (screens, state, tile map, ETA display).
- `lib/carpool/geo.ts` — distance, ETA and Web Mercator maths, no dependencies.
- `lib/carpool/push.ts` — Web Push (VAPID + aes128gcm) on Web Crypto only, so
  it runs on Cloudflare Workers where `web-push` can't.
- `app/api/carpool/*` — ping fan-out, push subscriptions, address lookup.
- Live positions ride Supabase Realtime; RLS scopes every table to the groups
  you belong to.

**Known limits — worth telling the parents**

- **Location only reports while the app is open and on screen.** Browsers stop
  the GPS watch when the tab is backgrounded or the phone locks. The driver
  needs the phone awake with `/carpool` in front (the app takes a screen wake
  lock to help). True background tracking needs a native app.
- **iPhone push requires installing the app**: Share → Add to Home Screen, open
  it from the icon, then turn notifications on in Settings (iOS 16.4+).
- Positions are last-known only — stopping sharing deletes the row, and no
  history of anyone's driving is kept.
- Map tiles come from OpenStreetMap's public servers. Fine at family scale;
  point `NEXT_PUBLIC_CARPOOL_TILE_URL` at your own tile provider if it grows.
- ETAs are straight-line distance with a detour factor, not routed directions.


<!-- Note: NEXT_PUBLIC_* env vars are inlined at build time. After changing them in Cloudflare, trigger a rebuild. -->
