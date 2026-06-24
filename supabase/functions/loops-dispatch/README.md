# Automation Loops

A **loop** is a scheduled AI job. The dispatcher runs every enabled loop daily.

**Publish policy is per-loop, not a global switch:**

| Loop | Kind | Output |
|---|---|---|
| `signal-brief` | `signal_brief` | **Auto-published** to `/intelligence` (by the Cloudflare Morning Brief worker). The dispatcher records a tracking run so it's visible in `/admin/loops`. |
| `daily-content` | `content_from_brief` | **Auto-published** to `/insights` (a `posts` row). Also drafts a LinkedIn post + newsletter blurb, stored on the run for the future (gated) outreach loop — those are **not** sent here. |
| outreach / pipeline hygiene | *(future)* | **Gated** — draft lands in `/admin/loops` for approval before anything leaves. |

Anything auto-published is reversible from the Loops tab (**Unpublish** clears
`posts.published_at` and marks the run rejected).

## Pipeline

```
13:00 UTC  Cloudflare worker → Morning Brief published to /intelligence
14:00 UTC  pg_cron → POST loops-dispatch  (x-loops-secret from Vault)
             ├─ signal_brief       → record tracking run (status 'published')
             └─ content_from_brief → fetch top-5 signals
                                      → Claude (claude-sonnet-4-6) drafts article + LinkedIn + newsletter
                                      → insert posts row (auto-publish)  ──► /insights
                                      → insert loop_runs row (status 'published')

/admin/loops → review published runs → Unpublish (pull a post back down)
            → review gated drafts    → Approve & send / Reject
```

## Pieces

| Piece | Where |
|---|---|
| Tables `loops`, `loop_runs` | `supabase/migrations/0003_loops.sql`, `0004_loops_publish.sql` (RLS: service-role only) |
| Publish target | `posts` table → `/insights` (`lib/cms.ts`, `app/(site)/insights`) |
| Dispatcher | this function (`loops-dispatch`, `verify_jwt = false`, guarded by `x-loops-secret`) |
| Schedule | `supabase/loops-cron.sql` (pg_cron job `loops-daily-content`) |
| Review UI | `app/admin/loops/page.tsx` + `app/admin/loops/actions.ts` |

## Required secrets (set once — NOT in git)

Set as **Edge Function** secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set LOOPS_DISPATCH_SECRET=<same value stored in Vault as loops_dispatch_secret>
```

The Resend secrets (`RESEND_API_KEY` + `CONTACT_FROM_EMAIL`) are only used by the
gated approve-and-send path, not by auto-publish.

Until `ANTHROPIC_API_KEY` is set, a content run records a `failed` row with a
clear error (rather than crashing), so you can see it in the Loops tab.

## Verify / trigger manually

```bash
# Dry run — fetches signals + builds the prompt per loop, no Claude call, no writes:
curl -s -X POST "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/loops-dispatch?dry=1"

# Real run (once secrets are set) — this AUTO-PUBLISHES content to /insights:
curl -s -X POST "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/loops-dispatch" \
  -H "x-loops-secret: <secret>"
```

Then open `/admin/loops` to see the published runs (and unpublish if needed).
