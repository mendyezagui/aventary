# Automation Loops

A **loop** is a scheduled AI job. Each run drafts content that lands in the admin
**Loops** tab (`/admin/loops`) for review. **Nothing is sent until you approve it.**

## Loop #1 — `daily-content`

Every morning, reuse the Morning Brief signals (`/api/morning-brief`) to draft a
LinkedIn post + newsletter blurb. Pipeline:

```
pg_cron (14:00 UTC daily)
  └─> POST loops-dispatch  (x-loops-secret from Vault)
        ├─ fetch top-5 signals from the Morning Brief
        ├─ Claude (claude-sonnet-4-6) drafts LinkedIn post + newsletter
        └─ insert loop_runs row  (status = 'drafted')

/admin/loops  →  review  →  Approve & send  →  Resend email to send_to
                         →  Reject          →  archived, never sent
```

## Pieces

| Piece | Where |
|---|---|
| Tables `loops`, `loop_runs` | `supabase/migrations/0003_loops.sql` (RLS: service-role only) |
| Dispatcher | this function (`loops-dispatch`, `verify_jwt = false`, guarded by `x-loops-secret`) |
| Schedule | `supabase/loops-cron.sql` (pg_cron job `loops-daily-content`) |
| Review UI | `app/admin/loops/page.tsx` + `app/admin/loops/actions.ts` |

## Required secrets (set once — NOT in git)

Set as **Edge Function** secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set LOOPS_DISPATCH_SECRET=<same value stored in Vault as loops_dispatch_secret>
```

Approval emails reuse the app's existing `RESEND_API_KEY` + `CONTACT_FROM_EMAIL`.

Until `ANTHROPIC_API_KEY` is set, a real run records a `failed` row with a clear
error (rather than crashing), so you can see it in the Loops tab.

## Verify / trigger manually

```bash
# Dry run — fetches signals + builds the prompt, no Claude call, no DB write:
curl -s -X POST "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/loops-dispatch?dry=1"

# Real run (once secrets are set):
curl -s -X POST "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/loops-dispatch" \
  -H "x-loops-secret: <secret>"
```

Then open `/admin/loops` to review the draft.
