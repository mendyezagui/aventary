# Client pages

Private documents for one client, served at `aventary.com/c/<slug>`, opened with
an emailed sign-in link rather than a password.

Adding one never touches Cloudflare.

---

## How access works

There is no password. A visitor types their email; if it is on that page's
allowlist they get a link that works **once** and expires in **20 minutes**.
Clicking it opens a **30-day session** scoped to that one page.

Three reasons this beats a shared password:

- **You know who read it.** A password tells you nothing. A sign-in link records
  the address, so you can see that the menahel opened it twice and the board
  member never did.
- **Forwarding is useless.** A password travels; a spent link does not. Someone
  who forwards their link gives away nothing, because it has already been used.
- **Nothing to rotate.** Removing a reader is one row, not a new password for
  everybody else.

The tokens table stores only a SHA-256 of each link, so the database never holds
anything that would let someone sign in. All three tables are RLS-enabled with
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

**4. Commit and push.** It deploys, and the page is live at `/c/acme-co`.

Send the recipient the URL on its own. There is nothing else to send — no
password, no second message.

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

## `/lcla` is the old way

The Cheder Menachem proposal at `/lcla` predates this and uses a shared password
from the `LCLA_PASSWORD` Cloudflare secret. It still works, and the link may
already be circulating, so it has been left alone.

The same document is also registered here, so once that link has served its
purpose it can move to `/c/lcla`: add a `client_pages` row with the school's
addresses, redirect `/lcla`, and delete `app/lcla`, `app/api/lcla` and
`lib/lcla.ts`. The Cloudflare secret becomes dead weight at that point and can
be removed — the last one this system will ever need.
