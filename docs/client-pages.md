# Client pages

Private documents for one client, served at `aventary.com/c/<slug>`.

A page can be opened two ways: an **emailed sign-in link**, and optionally a
**shared password**. Adding a page, changing a password, or adding a reader
never touches Cloudflare.

---

## How access works

**Sign-in link.** A visitor types their email; if it is on that page's allowlist
they get a link that works **once** and expires in **20 minutes**. Clicking it
opens a **30-day session** scoped to that one page.

**Shared password.** If the page has one, it appears above the email form. Same
session, same 30 days. Use it when a document needs to reach people whose
addresses you do not have, or when a client simply wants one thing to pass
around.

Both are offered together, so a recipient can use whichever suits them. Prefer
the link where you can, for three reasons:

- **You know who read it.** A password tells you nothing, and the access log
  says so honestly: a password sign-in is recorded as `(shared password)` with
  no name attached. A link records the address, so you can see that the menahel
  opened it twice and the board member never did.
- **Forwarding is useless.** A password travels; a spent link does not. Someone
  who forwards their link gives away nothing, because it has already been used.
- **Nothing to rotate.** Removing a reader is one row, not a new password for
  everybody else.

The tokens table stores only a SHA-256 of each link, and passwords are stored as
PBKDF2-SHA256 with 210,000 iterations and a random salt, so the database never
holds anything that would let someone sign in. All three tables are RLS-enabled with
no policies — only the server, holding the service-role key, can touch them.

---

## Adding a page

**1. Write the document.** A standalone HTML file: `<title>`, a `<style>` block,
then the body. The existing one — `content/clients/lcla.ts` — is the model. Two
rules: no backticks or `${` anywhere (they break the generated module), and
every CSS selector must sit under `.lcla`, which is what keeps the document's
styles from colliding with the rest of the site.

**2. Scaffold it.**

```bash
node scripts/new-client-page.mjs acme-co "Operating Review" ~/Desktop/review.html
```

That writes `content/clients/acme-co.ts`, wires it into
`content/clients/index.ts`, and prints the SQL for the next step. Edit the
`blurb` in the registry — it is the line under the title on the sign-in card.

**3. Open it to readers.** Run the printed statement in the Supabase SQL editor:

```sql
insert into client_pages (slug, title, allowed_emails) values
  ('acme-co', 'Operating Review', array['rivka@acme.com', 'sam@acme.com']);
```

**4. Optionally give it a password**, for readers whose addresses you do not
have:

```bash
node scripts/set-client-password.mjs acme-co 'SomethingMemorable'
```

That prints one `update` to run in Supabase. The password is hashed on your
machine — only the hash travels, and nothing goes into the repository. Pass
`--none` instead to remove a password later.

**5. Commit and push.** It deploys, and the page is live at `/c/acme-co`.

Send the URL on its own. If the page is link-only there is nothing else to
send; if you set a password, send that in a separate message.

---

## Day-to-day

**Add a reader** — no deploy needed:

```sql
update client_pages
set allowed_emails = allowed_emails || array['new@acme.com']
where slug = 'acme-co';
```

**Remove a reader** (also kill any session they already have):

```sql
update client_pages
set allowed_emails = array_remove(allowed_emails, 'old@acme.com')
where slug = 'acme-co';

delete from client_page_sessions where slug = 'acme-co' and email = 'old@acme.com';
```

**Close a page to everyone:**

```sql
update client_pages set active = false where slug = 'acme-co';
delete from client_page_sessions where slug = 'acme-co';
```

**See who has read it:**

```sql
select * from client_page_access where slug = 'acme-co';
```

**Update the document** — edit `content/clients/<slug>.ts`, push. Readers keep
their sessions and see the new version.

---

## Things worth knowing

**A page with no row is closed.** The document can be in the repo and still
show "not open yet" because nobody has been granted access. That is the
intended failure direction: a missing allowlist never means open to all.

**The sign-in card says the same thing either way.** Whether or not an address
is on the list, the visitor sees "if that address is on the list, a link is on
its way." Whether someone is a client's reader is itself worth not leaking.

**Five links per address per hour.** Enough for someone who loses one, low
enough that the form cannot be used to send mail at anyone.

**Search engines are kept out twice** — `noindex` on the page and `/c/` in
`robots.ts`.

**Email delivery is the failure mode to watch.** Links go through Resend from
`CONTACT_FROM_EMAIL`. If a client reports nothing arrived, check the Resend
dashboard first — spam filters are the usual culprit, not the code. Delivery
failures are logged server-side and deliberately never shown to the visitor.

---

## `/lcla` moved here

The Cheder Menachem proposal now lives at `/c/lcla`. The old `/lcla` URL is a
permanent redirect, so a link already in someone's inbox still works, and the
same password still opens it on the other side.

Its password moved out of the `LCLA_PASSWORD` Cloudflare secret and into the
database as a PBKDF2 hash. That secret is now unused and can be deleted from
Cloudflare — the last environment variable this system will ever need.

Only `mendy@aventary.com` is on its allowlist so far. Add the school's addresses
when you send it, and anyone who prefers a link over the password gets one.

---

## Generated pages

Everything above describes **authored** documents: a `content/clients/<slug>.ts` file,
written and reviewed like code, registered in `content/clients/index.ts`.

There is now a second source. `client_page_documents` in the `aventary` project holds
documents a machine produced — a BD dossier the Second Brain Associate generated for one
prospect — where deploying the site once per prospect is not an option.

`getContent()` checks the repo first and falls back to the table, so **an authored
document can never be shadowed by a generated one claiming its slug.**

Nothing else changes. Access control is keyed on the slug and knows nothing about where
the content came from, so a generated dossier gets the allowlist, the single-use sign-in
link, the 30-day session, the Ask panel and the access log exactly as `lcla` does.

| | Authored | Generated |
|---|---|---|
| Lives in | `content/clients/<slug>.ts` | `client_page_documents` |
| Changing it | commit + deploy | a row write |
| Wins a slug collision | **yes** | no |
| Gated by `client_pages` | yes | yes |

**Publishing a generated page is two writes, and they are deliberately separate:** the
document row, and the `client_pages` row that says who may read it. A dossier with no
`client_pages` row shows "not open yet" rather than falling open. Write the allowlist
last, on purpose — these documents name real people and carry their LinkedIn profiles.

The table is RLS-enabled with no policies, like every other `client_page_*` table: the
service role reaches it and nothing else does.
