# Repointing the personal app from A to B — readiness, 2026-09-11

The personal Second Brain app still reads database **A** (`xwacfwagyhgbbhefecdt`). Moving it
to **B** (`fukehjqikxqsntwhmgsk`) is what closes the last fork: until it happens, A's copies
of the social/content tables stay writable and can diverge from the ones now in B.

This is what it actually takes. Short version: it is two environment variables plus 29 rows
of data that are not in B yet.

## 1. The switch itself is a Vercel setting, not a code change

The app is a Vite build deployed on Vercel, and it picks its database at **build time**:

```js
// src/lib/supabase.js
export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL  || "";
export const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
```

Neither value is in the repository — they are Vercel project environment variables. So the
repoint is: change `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to B's, redeploy. The
same two variables also feed the `/api/*` serverless routes and therefore the two Vercel
crons (`/api/sweep` daily, `/api/content` Mondays), so those follow automatically.

Nobody with repository access can make this change. It is a dashboard job.

## 2. What is not in B yet

The app queries 49 tables. Nineteen of them do not exist in B — but that number is
misleading, because **eleven of them do not exist in A either.** Those are already-dead
references that return an error the loaders treat as "empty", and the repoint does not make
them any worse:

| Dead in both | Why |
|---|---|
| `llm_conversations`, `llm_messages` | dropped from A on 2026-09-11, deliberately |
| `spectari_blocks`, `spectari_bookings`, `spectari_items`, `spectari_models`, `spectari_reservations`, `spectari_settings` | never existed in A; the Spectari tab has always been dead here |
| `calendar_events`, `email_accounts`, `emails` | never existed in A |

`push_subscriptions` exists in A and is **empty**, so there is nothing to carry.

That leaves the real blockers — **7 tables, 29 rows**, both groups already marked keep-and-move:

| Group | Tables | Rows in A |
|---|---|---:|
| SoFa JCC | `sofa_events` 3, `sofa_nudges` 2, `sofa_flyers` 1, `sofa_work_orders` 1, `sofa_speakers` 0 | 7 |
| Vantaca | `vantaca_audit` 21, `vantaca_controls` 1 | 22 |

**Neither can move as data alone.** SoFa JCC has `sofa-jcc-scan` on A behind pg_cron job 5,
and Vantaca has `rc-controls` / `rc-debug` there. Copy the rows and leave the machinery
writing to A and you have rebuilt, table for table, the exact fork this whole consolidation
is unwinding. The function and the cron move with the data or the data does not move.

## 3. One thing that will look like a bug and is not

A has no `tenants` table, so `loadTenant()` returns null and the app treats that as
"owner — every module on". B does have one, and Mendy's tenant row enables nine of the ten
optional modules. **`sofa_jcc` is not among them.**

So on the day of the repoint, the SoFa JCC nav disappears — even once its tables are in B.
The fix is one jsonb key, and it belongs with the SoFa move rather than before it: turning
it on today just surfaces a tab with no tables behind it.

## 4. What is ready

Authentication. Mendy's tenant in B has two members and both have signed in before, so the
repointed app has a working login on the other side. B's RLS scopes every table to the
caller's tenant, which A never did.

## 5. Order

1. Move SoFa JCC — tables, `sofa-jcc-scan`, and pg_cron job 5 — then disable A's job.
2. Move Vantaca — tables and the `rc-*` functions that read them.
3. Turn on `sofa_jcc` in `tenants.modules` for the Mendy tenant.
4. Flip the two Vercel environment variables and redeploy.
5. Confirm the Social, Marketing, Pipelines and Morning Brief views read B.
6. **Only then** drop A's `contentCalendar`, `content_queue`, `socialCampaigns`,
   `socialStrategy`.

Step 6 is the one this document exists to protect. Those four tables are read *and written*
by `SocialMediaView`, `PipelinesView`, `MarketingView`, `MorningBriefView` and the Monday
`/api/content` cron. Dropping them before step 4 does not tidy anything up; it breaks four
views and a weekly job.
