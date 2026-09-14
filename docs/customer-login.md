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

**A project appears on `/see` when it has an active `client_pages` row.** That
is the same row that decides who may read it, on purpose: one table answers both
"does this exist" and "who may open it", so the staff index and a customer's own
shelf can never drift into disagreeing about either.

**`/see` does not read the CRM.** The temptation is to list `projects` live from
the Second Brain product database, and the reason not to is on the record in
`docs/second-brain-data-map.md`: that schema changed under this repo twice in one
week — `public_enabled` became `page_published`, `page_readers` appeared — and a
live read would have gone down with it. Adding a project to the portal is a row
here. If that ever becomes tedious enough to automate, automate it as a script
that writes these rows, not as a query the page depends on.

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
