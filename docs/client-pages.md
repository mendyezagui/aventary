# Client pages

Private documents for one client, served at `aventary.com/c/<slug>`.

A page can be opened two ways: an **emailed sign-in link**, and optionally a
**shared password**. Adding a page, changing a password, or adding a reader
never touches Cloudflare.

> **There is now a login above this.** `/c` is a customer sign-in: one address,
> and the documents shared with it. A page allowlist is still exactly what
> grants access, so everything below is unchanged and every link and password
> already sent out still works. What changed is that a customer can be sent
> `aventary.com/c` instead of a URL per document, and that staff see every
> project at `/see`. See **`docs/customer-login.md`**.

---

## Two ways to make one

**A project page** is the normal way, and takes no deploy and no SQL. You build
it in Client Hub, in Second Brain, and publish it with a checkbox. Start here.

**An authored page** is a hand-built HTML document in `content/clients/`, for a
one-off worth designing by hand — `bbdc` and `lcla` are the two. It takes a
deploy. Everything from "Adding a page" down describes this kind.

An authored file always wins a slug collision, so a generated page can never
shadow a reviewed one.

---

## Project pages

In Second Brain, open the project → **Client Hub**:

1. Write the sections. Each block has a **tab** (which becomes a numbered
   section of the document), a title, a markdown body, and a sort order.
2. Mark each block **Public** or **Private**. Private blocks are your working
   notes and never leave the building; the public ones are the document.
3. Set the **URL slug**, tick **Publish**, list **who may read it**, and Save.

That is the whole thing. The website builds the document from the blocks on
each request, so an edit in Client Hub is live on reload.

**What the page looks like, and what each block becomes, is a separate subject:
see `docs/client-document-template.md`.** A block can be a paragraph, a row of
numbers, a callout, a card grid, a timeline or a table, chosen with one line at
the top of its body; the client's logo and accent colour are one object in
`public_meta`. Neither needs a deploy.

The status line under the URL says what is missing rather than letting you
believe a page is up when it is not. A project with no public blocks is not
served at all — an empty document reads as a mistake to whoever opened it.

**Readers.** The list in Client Hub is the allowlist, unioned with
`client_pages.allowed_emails` here. The access-control row is created the first
time someone asks for a published page that names at least one reader, so
publishing does not also require an insert on this side. A published page with
no readers stays closed.

**How the content gets here.** One endpoint on Second Brain,
`project-page-feed`, which returns a published project's public blocks and its
reader list for one slug, and refuses anything else. It takes a shared secret in
`x-page-secret` and **fails closed** — an unset secret is a 503, never an open
door. Deliberately not a service-role key: this is a public marketing site, and a
key here that could read every tenant's CRM would be wildly out of proportion to
rendering a document.

Set `SECOND_BRAIN_URL` and `PAGE_FEED_SECRET` here, and `PAGE_FEED_SECRET` as a
secret on the Second Brain project. Unset, project pages are simply not found and
the other two sources still serve, so an unconfigured deploy degrades instead of
breaking.

**Markdown is markdown.** Block bodies render through `marked` with raw HTML
escaped, so a `<script>` pasted into a body shows as text.

**Sections collapse.** Native `<details>`, so it works without JavaScript and
everything opens when the page is printed. Nothing starts closed unless you say
so — see the template doc.

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

**See what they asked, and what they were told** — every exchange is also
emailed to `CONTACT_TO_EMAIL` as it happens, and listed at `/admin/questions`:

```sql
select created_at, slug, coalesce(email,'(shared password)') as asked_by,
       question, answer
from client_page_questions order by created_at desc limit 50;
```

A null `answer` means the reply never finished — the stream broke or the model
errored — which is worth seeing rather than hiding. A null `notified_at` means
the email about it did not go out; `portal_mail_events` says why.

**See who has read it:**

```sql
select * from client_page_access where slug = 'acme-co';
```

**Update the document** — edit `content/clients/<slug>.ts`, push. Readers keep
their sessions and see the new version.

---

## Ask

Every client page carries an **Ask** tab pinned to the middle of its right-hand
edge. It opens a rail beside the document where a reader can ask questions about it,
and it answers **only from that document** — the same session gates the endpoint
as the page, so it is never reading a proposal aloud to someone who guessed a
URL.

It used to be a bar across the top of the page. That was available to a reader
who had not started yet and gone by the time a question occurred to them, which
is the wrong half of the visit. Pinned to the edge it travels with them, and the
document gets the top of the page back.

**The edge, not the bottom-right corner, and deliberately.** That corner belongs
to `AskAventary`, the marketing site's own floating bubble in
`app/(site)/layout.tsx`. The two never share a screen — that one is on the public
pages, this one is behind the sign-in — but for a day they were both round
buttons in the same corner answering about different things, and they read as one
button following the reader everywhere. An edge tab cannot be mistaken for it.

On a screen wider than 1100px the document makes room for the rail rather than
being covered by it. Narrower than that the rail overlays, and closes itself
when the reader follows a citation — sending somebody to a passage and leaving
the rail on top of it is sending them nowhere.

### Every answer cites where it came from

An answer closes with **Read more here**, naming a section and scrolling the
document to it with a brief highlight. An answer about a proposal is a claim
about a document the reader is holding, and being shown the passage is what
separates it from a chatbot they have no reason to believe.

**Nothing needs anchoring by hand — not in Client Hub, not in an authored
file.** `lib/doc-anchors.ts` derives the anchors from the finished HTML on every
request, whichever of the three sources produced it: every heading, plus
anything carrying one of the section-label classes our templates use
(`.eyebrow`, `.section-eyebrow`, `.kicker`, `.phase-title`, `.col-title`,
`.wg-label`). Each gets an id made from its own words — `cpa-engagement-phases`
— so the same heading yields the same link on every request, and renaming a
block changes its link and nothing else.

Two things are deliberately left out of the index. An element that **already has
an id** is left exactly as it is: a hand-written id is somebody's decision and
this has no business overwriting it (it is also then not citable — give the
heading no id if you want it linkable). And a "heading" whose text is empty or
longer than 120 characters is skipped, which is how a div that happens to share
a class name stays out.

### How the citation survives being wrong

The model is shown the section list and asked to end each reply with
`SOURCE: <id>`. That line never reaches the reader: the panel strips it and
turns it into the link, and the bookkeeping strips it before the exchange is
recorded or emailed — the admin table and Mendy's copy name the section by its
title instead.

The id is then **checked against the document's real anchors before it becomes a
link**, so a section the model invented shows the reader nothing rather than a
link that goes nowhere. `SOURCE: none` — which the model is told to use when the
answer is not in the document — does the same. So an answer can arrive without a
citation, and that is correct: the alternative is pointing a client at a passage
that does not say what they were just told.

`splitAnswer()` in `lib/doc-anchors.ts` reads the line loosely (`Source:`,
`[cpa-x]`, a trailing full stop) because the cost of a strict parser is a
citation silently not appearing. It is not a trust boundary — the anchor check
is.

### Where the jump happens

A full document (`mode:"document"`) renders inside DocFrame's iframe, and a
`#id` link cannot reach into one. `app/c/[slug]/reveal.ts` is why the link works
anyway: the frame registers itself, and the jump measures the target's position
inside the frame and scrolls the **outer** page, which is the one that actually
scrolls. An inline document is an ordinary element and takes the short path.
Both end with the same highlight, applied as an inline style — a class would do
nothing inside the iframe, which carries the proposal's own stylesheet and not
this site's.

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

**A generated row should carry `blocks`, not `html`.** A row with `blocks` is
rendered through the shared template, so it gets the design system, the
collapsible sections, the contents rail and the client's branding — and every
later improvement to any of them. A row with finished `html` gets none of that,
ever, because by the time the row exists there is nothing left to lay out.
`blocks` wins where a row has both. See `docs/client-document-template.md` and
`.claude/skills/client-document/SKILL.md`.

The two rows written before that column existed (`micah`, `myef`) still serve
their html. They are live documents in front of named readers, and replacing
what somebody has been sent is not a migration's decision to make.

**Publishing a generated page is two writes, and they are deliberately separate:** the
document row, and the `client_pages` row that says who may read it. A dossier with no
`client_pages` row shows "not open yet" rather than falling open. Write the allowlist
last, on purpose — these documents name real people and carry their LinkedIn profiles.

The table is RLS-enabled with no policies, like every other `client_page_*` table: the
service role reaches it and nothing else does.
