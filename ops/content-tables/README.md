# Moving the social/content tables to B — 2026-09-11

100 rows: `contentCalendar` 86, `content_queue` 7, `socialCampaigns` 4, `socialStrategy` 3.
The full account is in `docs/second-brain-phase2-plan.md`; this directory holds the two
pieces of code the move needed.

| File | What it is |
|---|---|
| `import-rows.ts` | The narrow import endpoint deployed to B for the duration of the move |
| `tombstone.ts` | What `import-rows` was redeployed as afterwards — a 410, with `verify_jwt` flipped back on |

The schema and data changes live in the projects' own migration histories, which is the
durable record:

**B (`fukehjqikxqsntwhmgsk`)**
- `create_content_tables`
- `resync_content_table_identity_sequences`

**A (`xwacfwagyhgbbhefecdt`)** — the `net.http_post` pushes
- `push_social_strategy_to_secondbrain_os`
- `push_social_campaigns_and_content_queue_to_secondbrain_os`
- `push_content_calendar_to_secondbrain_os`

## Why an endpoint instead of an INSERT

There is no server-to-server path between the two Supabase projects, and `execute_sql` is
read-only on both, so every write goes through `apply_migration`. Writing the migration by
hand would mean carrying 174 KB of LinkedIn scripts and captions through a chat transcript
and re-escaping them — where one bad quote inside a 3,781-character script corrupts a row
silently, and the md5 check afterwards only proves the mistake was copied faithfully.

Sending `to_jsonb(row) || {"tenant_id": …}` over `net.http_post` means Postgres renders the
JSON and PostgREST parses it, with nothing reformatted in between. The md5 comparison is
then a real check of the transfer rather than a check of my own typing.

## If you ever need this again

Don't un-tombstone this one. Deploy a fresh endpoint, scoped to the tables that move, and
tombstone it the same day. An open insert endpoint guarded by a shared secret is fine for
an afternoon and not fine as a permanent fixture.
