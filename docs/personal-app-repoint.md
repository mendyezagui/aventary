# The personal app and database B — 2026-09-11

**Correction.** An earlier version of this document said the personal app still
read database A and that the repoint was a pending job. That was wrong. It was
inferred from the repo's `vercel.json` and the kill-A checklist rather than from
the thing that actually decides it — the deployed bundle. Checking the deployed
bundle settles it in one query, and that is what should have been done first.

## The app already reads B

`https://2nd.mendyezagui.com/assets/index-BYYmilmv.js`, minified, contains:

```js
ec = "https://fukehjqikxqsntwhmgsk.supabase.co",   // SUPA_URL
ma = "eyJ…",                                       // SUPA_KEY
XO = ec.startsWith("https://") && ma.length > 10,  // ENV_READY
Q  = XO ? YO(ec, ma) : null,                       // the shared client
```

`Q` is the client every `supabase.from(...)` in the app goes through. It is
built on **B**. So contacts, tasks, projects, `contentCalendar`,
`socialCampaigns`, `content_queue`, `socialStrategy` and the `sofa_*` tables are
all read from B, and have been since before this work started.

Two consequences that were not obvious:

- The Social, Marketing and Morning Brief views were reading tables that **did
  not exist in B** until this afternoon. They were not working. Moving the
  content tables is what fixed them, not what put them at risk.
- The app is served from **Cloudflare Pages**, not Vercel. `/api/content` and
  `/api/sweep` at `2nd.mendyezagui.com` return the SPA's `index.html`, not a
  function — the Vercel-format `api/*.js` routes do not run at that host. The
  one route that does run is the Cloudflare Pages Function at
  `functions/api/rambam-controls.js`, which answers 401.

## The one thing still pointed at A

The deployed bundle also carries a **second** client, hardcoded to A:

```js
YM = "https://xwacfwagyhgbbhefecdt.supabase.co", XM = "eyJ…", Bo = YO(YM, XM)
```

`Bo` is used in exactly one place — the Vantaca Controls view, for
`vantaca_controls` and `vantaca_audit`. Nothing else in the bundle touches it.

**This is already fixed in `main`.** `src/views/VantacaControlsView.jsx` at
`fe532d6` imports the shared client and reads Vantaca through it; there is no
second `createClient` anywhere in the repo. The deployed bundle is simply older
than `main`. A redeploy moves Vantaca onto B, where its rows now are. No code
change is needed — only a build.

## The open question: is there still a Vercel project?

`vercel.json` declares two crons, `/api/sweep` daily and `/api/content` Mondays,
and `api/content.js` writes drafts into `content_queue`. Those routes do not run
at `2nd.mendyezagui.com`, but they would run on a `*.vercel.app` deployment if
one still exists, against whatever database that project's environment variables
name.

That is the only reason A's four content tables have not been dropped. Two
outcomes:

- **No live Vercel project, or its env points at B** → drop A's
  `contentCalendar`, `content_queue`, `socialCampaigns`, `socialStrategy`.
  Nothing reads them.
- **A live Vercel project whose env points at A** → point it at B first. Its
  Monday content brain is currently writing drafts into a database the app no
  longer reads, which is its own quiet failure.

Checking the project's environment variables settles it.

## Status

| | Where it runs | Where its data is |
|---|---|---|
| App (all views but Vantaca) | Cloudflare Pages | **B** |
| Vantaca Controls view | Cloudflare Pages | **A** until the next build; fixed in `main` |
| Associates | **B**, cron job 5 | **B** |
| SoFa JCC | **B**, cron job 7 | **B** |
| Social / content | — | **B** (A's copies still present, pending the question above) |

Database A now has **no active cron jobs**.
