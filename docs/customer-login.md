# The customer login

`aventary.com/c` is one sign-in. Behind it a customer sees the documents shared
with their address and nothing else; `aventary.com/see` is the same list without
the filter, for Mendy and for anyone who works with him.

Everything under `/c` is gated. That was already true document by document —
this is the layer above it, which turns a pile of separately-gated URLs into
somewhere a person signs in once.

---

## The shape of it

| | |
|---|---|
| `/c` | Sign in. Once signed in, the documents shared with your address. |
| `/c/<slug>` | One document. Unchanged. |
| `/see` | Every active project. Owner and staff only. |
| `/portal/verify` | Where sign-in links land. Spends the token, sets the cookie. |
| `/portal/signout` | Ends this device's session. |

Three roles, and only two of them need a row in the database:

- **owner / staff** — sees every active page, and `/see`. One row in
  `portal_people`.
- **client** — sees the pages whose `allowed_emails` carry their address.
  **No row needed.** Their access is the allowlist, which is where it has always
  lived and where it gets edited on a phone call.

## Two ways in, and why both still exist

A document can be opened by a **portal session** (the login above) or by a
**page session** — the `cp_<slug>` cookie, from a link emailed for that one
document or from its shared password. Either is enough, and they are checked
independently.

Keeping the second was not politeness. Those links and passwords are in clients'
inboxes right now; a deploy does not get to invalidate them.

The difference that matters is identity:

| | Portal session | Page link | Page password |
|---|---|---|---|
| Knows who you are | yes | yes | **no** |
| Opens | everything shared with you | that one document | that one document |
| Reaches `/c` or `/see` | yes | no | no |

A shared-password session has no identity — the access log records it as
`(shared password)` because that is the truth — so there is nobody to build a
list for. It opens the document it was used on. That is what a password is good
for, and it is the reason a password can never be the way into the index.

---

## Day-to-day

**Add an employee** — they see every active project at `/see`:

```sql
insert into portal_people (email, name, role)
values ('sarah@aventary.com', 'Sarah', 'staff');
```

**Add a customer** — unchanged from before, and still no deploy:

```sql
update client_pages
set allowed_emails = allowed_emails || array['new@acme.com']
where slug = 'acme-co';
```

They can now sign in at `/c` and will find that page waiting. Send them
`aventary.com/c` rather than a document URL — the right documents find them.

**Block someone outright**, allowlists included:

```sql
-- Works whether or not they had a row: a client never needs one until now.
insert into portal_people (email, active) values ('gone@acme.com', false)
  on conflict (email) do update set active = false;
delete from portal_sessions where email = 'gone@acme.com';
```

`active = false` beats every grant rather than sitting alongside one, so removing
somebody is a single write instead of an audit of every page. Roles are re-read
on every request, so it takes effect on their next page load — but delete the
sessions too and it takes effect now.

**Sign someone out everywhere:**

```sql
delete from portal_sessions where email = 'them@acme.com';
```

**Dress a project up for `/see`** — three optional columns on `client_pages`:

```sql
update client_pages
set client_name = 'Prime Rock Realty',
    summary     = 'Luxury Presence audit; waiting on deal volume before sizing.',
    sort        = 10
where slug = 'micah';
```

`client_name` and `summary` are staff-facing. A client never sees either — `/c`
shows the title alone.

**See who is signed in:**

```sql
select * from portal_access;     -- portal sessions, with role
select * from client_page_access; -- the per-page sessions, as before
```

---

## Things worth knowing

**Who may read a page is a union, and there is one function that knows it.**
`readersFor()` in `lib/client-pages.ts` combines `client_pages.allowed_emails`
with the reader list on the published Second Brain project behind that slug. A
project page is provisioned here with `allowed_emails` **empty** on purpose —
its readers are named in Client Hub — so anything that reads `allowed_emails`
directly looks correct and silently excludes every project-page reader. The
customer login had exactly that bug for about an hour: sign-in links worked
while `/c` showed those customers an empty shelf. Ask `readersFor()`, or
`mayRead()` in `lib/portal.ts`, and never the column.

**A project appears on `/see` once it has an active `client_pages` row**, which
is the same row that decides who may read it — one table answers both "does this
exist" and "who may open it", so the staff index and a customer's own shelf
cannot drift into disagreeing.

**Known gap: that row is created lazily.** `getPageRow()` provisions it the first
time anyone asks for the slug, so a project published in Client Hub and not yet
opened by anybody is **not** on `/see` yet. Open it once and it appears. The
honest fix is a list mode on the `project-page-feed` endpoint — it takes a slug
today, so this side has no way to ask "what is published?" — and that endpoint
lives on the Second Brain side, not here.

**`/see` does not query the CRM for the project list.** Content comes across
through one narrow, slug-keyed endpoint holding a secret that can fetch published
page content and nothing else; the index itself is built from this repo's own
table. That split is the point, and `docs/second-brain-data-map.md` says why:
that schema moved under this repo twice in one week — `public_enabled` became
`page_published`, `page_readers` appeared. Content that degrades to "page not
found" when the feed is unreachable is survivable. A staff index that goes blank,
or an access check that starts saying yes, is not.

**The portal cookie is site-wide, and the per-page one is not.** `cp_<slug>` is
scoped to `path=/c/<slug>` so a confidential-document cookie is not attached to
every request on the site. `av_portal` cannot be — it has to be readable at `/c`,
at `/see` and at every document. That is the price of one login. It is httpOnly,
it is an opaque random string with no identity in it, and `portal_people.active`
is the kill switch that pays for it.

**The sign-in form never confirms an address.** Known, unknown, blocked, rate
limited — all four get "if that address is one we know, a link is on its way."
Whether someone is a customer of ours is not a fact a form should confirm to a
stranger who guesses.

**Five links per address per hour**, as on the per-page form.

**A sign-in email that fails is invisible to the person waiting for it, on
purpose — so it is shown to you instead.** The form must answer identically
whether or not it really sent anything, because "we could not mail you" confirms
the address is one we know. That silence hid a four-month outage: the Worker had
no `RESEND_API_KEY`, no link had ever been delivered, and the form said one was
on its way every time.

Two things now close that. Config problems are reported to the visitor directly,
since a missing secret is a fact about the deploy and identical for every address
on earth. Delivery problems are recorded in `portal_mail_events` and shown on
`/see` — how many failed in the last week, the provider's own error, and when the
last email *did* go out, so one bounced address does not read as an outage.

**Resend does not throw.** `resend.emails.send()` resolves with
`{ data: null, error }` on an API error — bad key, unverified domain, rejected
from-address — so a bare `try/catch` catches none of the failures most likely to
happen. Both sign-in routes read that `error`. **Anything else in this repo that
sends mail must do the same**, or it will fail exactly as silently as this did:

```ts
const { error } = await resend.emails.send({ ... });
if (error) { /* record it — it will not be thrown */ }
```

**Non-secret config belongs in `wrangler.jsonc`, not the dashboard.** A deploy
REPLACES a Worker's plain-text variables with whatever the config declares, so
declaring none removes every one added by hand. Encrypted Secrets are untouched —
which is why `RESEND_API_KEY` survived a deploy that erased `CONTACT_FROM_EMAIL`
on the same Worker, and why the breakage looked arbitrary: mail was fixed by
hand, proved working, and died twenty minutes later on the next push.

`CONTACT_FROM_EMAIL` and `CONTACT_TO_EMAIL` are now in the `vars` block, where a
deploy restores them. Credentials stay out of that file and are set as type
**Secret**: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAGE_FEED_SECRET`.

To read the log directly:

```sql
select created_at, context, email, ok, error
from portal_mail_events order by created_at desc limit 20;
```

**RLS on a table does not cover a view over it.** Both access-log views were
readable with the public anon key until `0010` — the tables were locked down
correctly, but a Postgres 15+ view runs as its *owner* unless you set
`security_invoker`, so the view read past RLS and handed the rows to whoever
asked. `client_page_access` was returning nine real rows to an unauthenticated
request; only luck kept addresses out of them, since every session so far had
been a shared-password one that names nobody. **Any new view in this schema
needs `security_invoker = on` and the anon grants revoked.** Check it the way
this was checked — against the endpoint, with the anon key, not against the
catalogue:

```bash
curl -s "https://uclyawqdeabjsrejfdlw.supabase.co/rest/v1/<view>?select=*" \
  -H "apikey: <the anon key>"
```

`permission denied` is the right answer. Rows are not. `select * from
portal_access` in the SQL editor still works — that runs as postgres, and the
site reads these tables with the service role, which bypasses RLS.

**A signed-in customer who guesses another client's slug** is told the page is
not shared with them, without its title. An anonymous visitor who guesses one
still sees the sign-in card with the title and blurb on it — that is unchanged
behaviour, and it is what makes the card make sense to the person who was sent
the URL.

**Nothing here is in search.** `/see` and `/portal/` join `/c/` in `robots.ts`,
and every page serves `noindex`. `/c` itself is deliberately left crawlable so
Google can read that `noindex` — and because a bare `Disallow: /c` would also
match `/contact`, `/chart` and `/camp-letter`.

---

## The migration

`supabase/migrations/0009_portal_accounts.sql`, against the `aventary` project
(`uclyawqdeabjsrejfdlw`). It is additive only — three new tables, three new
nullable columns on `client_pages`, one view, and `mendy@aventary.com` seeded as
owner. It alters no existing column and drops nothing, so it can be applied
before or after this code deploys and in any order relative to other work.

Until it is applied, every lookup fails closed: `/c` and `/see` show a sign-in
card that issues no links, and `/c/<slug>` behaves exactly as it did before.
