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

## `/modeh` — the morning blessings

A second personal app hosted alongside `/tehillim`: Birchot HaShachar, the
blessings said on waking, arranged as a morning sit. Each blessing gets its
Hebrew, a transliteration and a plain English translation, plus what that
blessing is noticing and one thing to do while you say it. Several carry a
written question; the answers land in a journal with a streak count.

- Routes: `/modeh` (home + settings), `/modeh/session` (the sit),
  `/modeh/journal`, `/modeh/about` (sources and method).
- Content lives in `app/modeh/blessings.ts`.

### Nusach

Three, each transcribed from a printed siddur — the source is named in the file
header and on `/modeh/about`:

| | Source | Opening blessing | The three of identity |
|---|---|---|---|
| **Ari (Chabad)** — default | *Siddur Torah Or* (Schulzinger Bros., 1940) | `הנותן לשכוי` | late, before `המעביר שינה` |
| **Ashkenaz** | *Metsudah Siddur* (1981), via Sefaria | `אשר נתן לשכוי` | second |
| **Sefard** | Nusach Sefard weekday shacharit, he.wikisource | `אשר נתן לשכוי` | second |

The order is data (`AFTER_NESHAMAH` in `blessings.ts`), not a hard-coded array,
because Nusach Ari genuinely reorders the fifteen. Ari and Ashkenaz also differ
inside `אשר יצר`, `ויהי רצון` and the Torah blessings; those are per-nusach
variants on the station.

**The pointed Hebrew was typed by hand from those sources — proofread it against
a siddur before relying on it.** For the Ari nusach the reference edition is the
*Weiss Edition Siddur Tehillat Hashem* (Kehot with Tzivos Hashem, 2017; compact
edition 2024) — Chabad nusach, synopsis per tefillah, explanation blended into
the translation, page cross-references to the Kehot Annotated Siddur. It is
print only. Its translation, synopses and insights are **not** reproduced in
this app; every English line here is written for the app.

### Levels

`depth` in `store.ts`, `LAYER` in `blessings.ts`. Not levels of study — levels of
how much room the reader is given to notice:

- **quiet** — the Hebrew and one thing to do while saying it. No reflection
  panel, no questions.
- **guided** (default) — what the blessing is noticing, plus a written question
  on the stations that declare their own `prompts`.
- **deep** — a second paragraph on every station (`LAYER[id].deeper`) and a
  question on every one; stations without their own `prompts` draw from
  `LAYER[id].prompts`.

The Hebrew is identical at all three levels.

### What the sit covers

24 stations on the full morning: Modeh Ani, netilat yadayim, Asher Yatzar,
Elokai Neshamah, the fifteen in the order of the nusach, then `ויהי רצון`, the
`יהי רצון ... שתצילני`, Birchot HaTorah, Birkat Kohanim and `אלו דברים`. The last
four were added after the first pass — without them the morning blessed the
learning of Torah and then didn't learn any. `שתצילני` differs materially by
nusach: Ashkenaz (Metsudah) prints the short list, Ari and Sefard the long one,
and Sefard alone adds `מיצר רע`. No distinct Nusach Sefard printing of Birkat
Kohanim or `אלו דברים` was found, so those use the shared text.

### Other settings that change the text

- **Voice** — masculine/feminine sets `מודה` / `מודה` and automatically swaps the
  third blessing of identity to `שעשני כרצונו`, printed that way in all three
  sources. (Some siddurim also print `גויה` / `שפחה` in the two before it; the
  sources used here do not, so the app leaves them as printed.)
- **The Name** — full or substituted (`ה׳` / `אלקינו`). The substitution moves
  the Hebrew, the transliteration and the English together, so a text is never
  half-swapped.
- **Length** — short sit (the core blessings) or the full morning, with Vihi
  Ratzon and Birchot HaTorah on by default.

### Why the questions rotate

The liturgy repeats; the written question does not. Research from Lyubomirsky's
lab found weekly gratitude journaling beat three-times-weekly — the frequent
group gained nothing, because a prompt you have answered forty times stops
making you look. So each station holds a set of prompts and rotates by day
index, offset by station position. The closing screen asks for an if-then plan
(trigger, then action) rather than a resolution, after Gollwitzer & Sheeran's
meta-analysis of 94 studies. `/modeh/about` states all of this to the reader.

### Storage and hosting

- Everything is in `localStorage` (`modeh.settings.v1`, `modeh.journal.v1`). No
  account, no server, nothing written leaves the device. Switching phones loses
  the journal — that is the trade for not holding somebody's private writing on
  a server.
- Installable: `public/modeh/manifest.webmanifest` plus icons, scoped to
  `/modeh`, so "Add to Home Screen" gives a standalone app.
- Kept out of search (`noindex`) and away from AI training crawlers
  (`app/robots.ts`), same as `/tehillim`.

## What's intentionally out of scope

- Image uploads for the CMS — add Supabase Storage later when you need it.
- Multi-user accounts — only the email allowlist is gated.
- Redirects from Squarespace-specific URLs — your sitemap is already /home,
  /about, /contact, /appointments, /insights, /insights/:slug, which match.


<!-- Note: NEXT_PUBLIC_* env vars are inlined at build time. After changing them in Cloudflare, trigger a rebuild. -->
