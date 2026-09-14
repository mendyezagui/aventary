# aventary

The Aventary website: Next.js on OpenNext, deployed to Cloudflare from CI.
Its database is the Supabase project `uclyawqdeabjsrejfdlw` ("aventary").

## Before you build a client-facing page

**There is one system now: `aventary.com/c/<slug>`, and it is always gated.** It
serves a document from one of three sources, in this order — an authored file in
`content/clients/`, a published Second Brain project's public blocks, or a row in
`client_page_documents`. Access control is the same whichever it came from, and
lives in this repo. See `docs/client-pages.md`.

Normal work is a **project page**: build it in Client Hub, tick Publish, name the
readers. No deploy. Reach for `content/clients/` only for a one-off worth
hand-designing.

**"Gated" now means a customer login.** `/c` is one sign-in: a person enters
their address and finds the documents shared with it, rather than needing a URL
per document. Owner and staff see every active project at `/see`. A page's
readers are the union of `client_pages.allowed_emails` and the project's own
reader list in Client Hub, so a project page can be opened to somebody without
touching this repo — use `readersFor()` in `lib/client-pages.ts` rather than
reading `allowed_emails` directly, or you will miss half the readers. See
`docs/customer-login.md`.

History worth keeping, because it was wrong twice: a second, **unauthenticated**
publishing path used to exist — the `client-page` edge function on Second Brain,
reading `projects.public_enabled`. Two documents (`bbdc`, `micah`) were served
that way to anyone who guessed the slug. An earlier note here claimed `bbdc` had
been closed on 2026-09-11; it had not, and the endpoint was still answering three
days later. On 2026-09-14 both flags were cleared, the function was replaced with
a 410, and the column was renamed `page_published` so nobody reads the old promise
into it. **Verify a claim like that against the endpoint, never the row.**

## Before you touch Second Brain data

**The CRM lives in `secondbrain-os` (`fukehjqikxqsntwhmgsk`).** That is the only
database that accepts CRM writes.

The older `xwacfwagyhgbbhefecdt` project holds a read-only archive: its 19 CRM
tables were frozen on 2026-09-11 and will refuse every insert, update and delete.
If a write there fails, that is working as intended — point the writer at
`secondbrain-os` rather than lifting the freeze. See `docs/crm-freeze.md`.

The two databases diverged for a month and have colliding ids — `projects.10010`
and `contacts.206` are different records in each — so neither is a copy of the
other. `docs/second-brain-data-map.md` says which is which.
