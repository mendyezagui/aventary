# Where the personal app actually reads from — settled 2026-09-11

Two earlier versions of this document got this wrong in opposite directions. This
one is settled from evidence, and the evidence is recorded so nobody has to take
it on trust.

## The app reads B, and has all along

The deployed bundle at `2nd.mendyezagui.com` builds its one shared Supabase
client on **B** (`fukehjqikxqsntwhmgsk`). Every `supabase.from(...)` in the app
goes through it. There was never a repoint to do.

The single exception is the **Vantaca Controls** view, which the deployed bundle
reads through a second client hardcoded to A. That is already fixed in `main` —
`VantacaControlsView.jsx` imports the shared client — so the deployed bundle is
just older than `main`, and the next build carries it over. No code change.

## The Vercel project exists, and it is a leftover

This was the open question, and it did not need the Vercel dashboard to answer.
Database A's own `agentlogs` shows a morning sweep landing every single day:

| | A (Vercel `/api/sweep`) | B (pg_cron job 1) |
|---|---|---|
| Sep 9 | 13:37 UTC | 14:30 UTC |
| Sep 10 | 14:39 UTC | 14:30 UTC |
| Sep 11 | 15:36 UTC | 14:30 UTC |

Both run. They produce different briefs from different data — A's says "374
contacts, 4 active deals, ~$112K pipeline", B's says "198 contacts, 3 active
deals, $5,250" — and **the app only ever showed B's**, because the app reads B.
The drifting A times are the signature of a Vercel Hobby cron, which fires
approximately rather than on the minute.

So the Vercel project is real, its environment points at A, and everything it
does is either duplicated or dead:

- **`/api/sweep`, daily.** Duplicates B's own sweep. Its CRM writes already fail:
  `company_news` is one of the 19 tables frozen on A. All it still manages is
  three log lines a day into `agentlogs`, in a database nothing reads.
- **`/api/content`, Mondays.** Has written nothing since 2026-06-29. It is not
  broken — it is skipping. The route stops when six unreviewed drafts are queued
  (`QUEUE_CEILING = 6`) and there were exactly six. Seventy-four days of
  "skipped".

Deleting the Vercel project is tidy-up, not a fix. Nothing breaks if it is never
deleted, and nothing is lost if it is.

## A's four content tables are dropped

Done on 2026-09-11, once the above was established. `dailyMarketingView` depended
on `contentCalendar`; it was recreated in B first, with `security_invoker = true`
so the tenant policy applies to whoever selects from it rather than to the view's
owner — without that, one tenant's view of "today's posts" would quietly return
everybody's.

## Status

| | Runs on | Data in |
|---|---|---|
| App, every view but Vantaca | Cloudflare Pages | **B** |
| App, Vantaca Controls | Cloudflare Pages | **A** until the next build; fixed in `main` |
| Associates | **B**, cron job 5 | **B** |
| SoFa JCC | **B**, cron job 7 | **B** |
| Morning sweep | **B**, cron job 1 | **B** |
| Vercel `/api/sweep`, `/api/content` | Vercel | A — duplicate and dead respectively |

Database A has **no active cron jobs** and no social, content, Associates, SoFa
or Vantaca tables left.
