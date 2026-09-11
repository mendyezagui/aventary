# aventary

The Aventary website: Next.js on OpenNext, deployed to Cloudflare from CI.
Its database is the Supabase project `uclyawqdeabjsrejfdlw` ("aventary").

## Before you build a client-facing page

There are two unrelated systems that publish a document for one client, and they
share no code and no database. This repo has one of them; the Second Brain product
app has the other. **Read `docs/second-brain-data-map.md` before adding either.**

- This repo: `aventary.com/c/<slug>` — gated, content in `content/clients/`,
  access control in the `aventary` Supabase project. See `docs/client-pages.md`.
- Elsewhere: `projects.client_slug` / `public_enabled` in the Second Brain
  **product** database, served publicly by an edge function. No access control.

A confidential document must not go in the second one as it stands. The one page
that was published that way (`bbdc`) was closed on 2026-09-11.

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
