# Migrating Cheder Menachem (`lcla`) to the block model

A runbook for moving `aventary.com/c/lcla` from a hand-authored HTML file in
this repo to a Second Brain project built from blocks.

Written to be handed to a fresh Claude Code session. Everything stated as fact
below was verified against the live databases and this repo on 2026-09-16 — but
**re-verify before you act on it**, because somebody may have moved since.

---

## 0. The prompt to open the new session with

Paste this as the first message; everything else it needs is in this file.

> Migrate `aventary.com/c/lcla` (Cheder Menachem) from the hand-authored HTML
> page in `content/clients/lcla.ts` to the block model, following
> `docs/migrating-lcla-to-blocks.md` in this repo. Read that runbook first, then
> re-verify its "starting state" section against the live databases before you
> act on any of it — it was written on 2026-09-16 and things may have moved.
>
> The Second Brain project already exists (`10013`, slug `lcla`, published, zero
> blocks). Build the blocks there first. Do **not** delete anything from this
> repo until the blocks are in, the preview harness renders them correctly, and
> I have said go — the authored file wins the slug, so nothing changes for the
> reader until it is removed, and removing it early makes the page a 404 for a
> named client.
>
> Show me the preview screenshot before the cutover commit. Ask me for the
> school's accent colour and confirm the reader list with me rather than
> guessing at either.

---

## 1. What you are actually changing

`/c/<slug>` resolves content from three sources, in this order
(`lib/client-pages.ts`, `resolveContent`):

1. **An authored file** in `content/clients/` — always wins.
2. **A published Second Brain project**, fetched through the `project-page-feed`
   edge function and rendered from its public blocks.
3. **A row in `client_page_documents`.**

Access control is identical whichever source serves. It is keyed on the slug and
knows nothing about where the content came from.

`lcla` is currently served by **source 1**. The job is to make it served by
**source 2**, with no visible loss for the reader.

**Read these before writing anything:**

| File | Why |
|---|---|
| `docs/client-pages.md` | The system, both page kinds, how access works |
| `docs/client-document-template.md` | The component registry and `public_meta` — the core reference for this job |
| `docs/customer-login.md` | `/c` sign-in, `/see`, and how readers are unioned |
| `lib/client-doc/parse.ts` | The directive parser and every component's exact body shape |
| `lib/client-doc/svg.ts` | The SVG sanitizer allowlist |
| `content/clients/lcla.ts` | The document you are converting |
| `app/c/[slug]/client-page.css` | Lines 1–~148 are the `.lcla` styles that die with it |

---

## 2. Starting state — verified, but re-check it

### Second Brain (`fukehjqikxqsntwhmgsk`, the `secondbrain-os` project)

**The project already exists and is already published.**

```sql
select id, name, client, "companyId", client_slug, page_published,
       page_readers, jsonb_pretty(public_meta), tenant_id
from projects where id = 10013;
```

| Field | Value |
|---|---|
| `id` | `10013` |
| `name` | `Cheder Menachem — Graphite replacement program` |
| `client` | `Cheder Menachem — Los Angeles` |
| `companyId` | `171` |
| `client_slug` | `lcla` |
| `page_published` | `true` |
| `page_readers` | `{rabbichein@chedermla.com}` |
| `public_meta` | `{}` — empty |
| `tenant_id` | `0a7225ba-7625-4881-8d8f-237424282b3b` |
| **blocks** | **0. None. This is the whole job.** |

Company `171` (`Cheder Menachem — Los Angeles`) has **no `logo_url`**.

### The website (`uclyawqdeabjsrejfdlw`, the `aventary` project)

```sql
select slug, title, active, allowed_emails from client_pages where slug = 'lcla';
```

`allowed_emails` = `{mendy@aventary.com, rabbichein@chedermla.com}`, `active` =
`true`. There is **no** `client_page_documents` row for `lcla`, so source 3 is
not in play.

### This repo

- `content/clients/lcla.ts` — one exported `html` string, the whole document.
- `content/clients/index.ts` — registers it with `title` and `blurb`, **no
  `mode`**, so it renders `inline`: injected into a `<div className="lcla">`.
- `app/c/[slug]/client-page.css` — 99 selectors under `.lcla`. The rest of the
  file (`.cp-gate`, `.cp-whoami`, `.cp-form`, from ~line 149) is the sign-in
  gate and **must survive**.
- `next.config.mjs` — a redirect from `/lcla` to `/c/lcla`. **Leave it.** It has
  nothing to do with the source of the content.

---

## 3. The property that makes this safe

**The authored file wins.** So you can build every block, set `public_meta`, fix
the readers, and preview the whole thing, and the live page does not change by
one pixel — because `content/clients/lcla.ts` keeps winning the slug.

The cutover is a single commit: delete the file, its registry line, and its CSS.
Everything before that is reversible with no deploy and no reader impact.

**Do the database work first. Do the repo deletion last.** Not the other way
round: deleting the file while the project has zero blocks makes `/c/lcla` a 404
for a named reader.

> A project with no public blocks is **not served at all** — the feed refuses it,
> deliberately, because an empty document reads as a mistake to whoever opened
> it. That is the failure mode you are avoiding by ordering it this way.

---

## 4. Inventory the source document

`content/clients/lcla.ts` is a single escaped HTML string. Get it readable
first — do not try to read it as-is:

The exported string is a JSON string literal, so `json.loads` unescapes it
exactly. This is verified to work — it produces 27,722 characters:

```bash
cd /home/user/aventary
python3 - <<'PY'
import json, re, pathlib
src = pathlib.Path('content/clients/lcla.ts').read_text()
m = re.search(r'export const html = ("(?:[^"\\]|\\.)*");', src, re.S)
out = json.loads(m.group(1))
pathlib.Path('/tmp/lcla.html').write_text(out)
print('wrote /tmp/lcla.html —', len(out), 'chars')
PY
```

Then read `/tmp/lcla.html`. You will find a masthead and nine numbered sections.
Here is the mapping to build — **each row is one or more blocks**:

| Source | Becomes | Component |
|---|---|---|
| `.masthead` h1 + `.standfirst` + `.meta` | `public_meta` (`heading`, `subheading`, `prepared_for`, `prepared_by`) — **not a block** | — |
| `.hero-nums` (Status / Proposed first step / This document) | one block | `keyvalue` |
| **01** What you asked for — "The brief, as we heard it" | one block | `prose` |
| **02** What we found — "We took the current system apart first" | one block | `prose` |
| **02** `.notice.brass` — "One finding worth stating on its own" (no tuition assistance) | one block | `callout` + `@tone: warn` |
| **03** How we define success — "We measure 'frustrating' before we fix it" | one block | `prose` |
| **04** The approach — "Replace it in pieces, worst-case first" | one block | `prose` |
| **04** the `<figure>` sequence diagram + `<figcaption>` | one block | `svg` — **see §8, this is the hard one** |
| **05** The sequence — the 10-row module table | one block | `table` |
| **05** `.notice` — "What stays with Graphite … and possibly for good" | one block | `callout` + `@tone: quiet` |
| **06** Better, not just newer — the lede | one block | `prose` |
| **06** the 8 `.ai` items | one block | `cards` + `@columns: 2` |
| **06** `.notice.warn` — "Where we would push back on AI" | one block | `callout` + `@tone: warn` |
| **07** Your side — the 6 numbered asks | one block | `prose` (an ordered list) |
| **08** Risks — the 5 `.cost` items | one block | `cards` + `@columns: 2` or `steps` |
| **09** The ask — "Start with two weeks of discovery" + the 5 bullets | one block | `prose` |
| `p.foot` — the provenance paragraph | one block | `callout` + `@tone: quiet` |

Suggested tabs (each tab becomes one numbered section of the rendered
document, in `sort` order):

```
Where this stands      → hero-nums
What you asked for     → 01
What we found          → 02 + the brass notice
How we define success  → 03
The approach           → 04 + the diagram
The sequence           → 05 + its notice
Better, not just newer → 06 + cards + the AI notice
What this needs        → 07
Risks                  → 08
The ask                → 09 + the provenance note
```

### Do not lose anything

Before you delete the authored file, diff the word count. The prose in that
document is good and was written deliberately:

```bash
python3 - <<'PY'
import re, html, pathlib
t = pathlib.Path('/tmp/lcla.html').read_text()
t = re.sub(r'<svg.*?</svg>', ' ', t, flags=re.S)
t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
print('source words:', len(t.split()))
PY
```

Compare against the sum of your block bodies. A large drop means you summarised
something you were supposed to carry across.

---

## 5. Writing the blocks

### Table shape

```
project_blocks(id, tenant_id, project_id, tab, title, body, format, visibility, sort, created_at, updated_at)
```

- The column is **`visibility`** (`'public'` / `'private'`), **not** `is_public`.
- `format` is `'markdown'`.
- `tenant_id` is `NOT NULL` — copy it from an existing row rather than typing a
  UUID: `select tenant_id from projects where id = 10013`.
- `sort` orders blocks **within and across** tabs. Use the MYEF convention:
  leave gaps. `100, 101, 102` for the first tab, `200, 201` for the next, and so
  on. Gaps are what let you insert later without renumbering.

### Insert pattern

```sql
insert into project_blocks (tenant_id, project_id, tab, title, body, format, visibility, sort)
values (
  (select tenant_id from projects where id = 10013),
  10013,
  'What we found',
  'We took the current system apart first',
  $md$Before proposing anything, we surveyed the school-software market and then
examined your Graphite instance directly …$md$,
  'markdown', 'public', 300
);
```

**Use `$md$…$md$` dollar-quoting for every body.** These documents are full of
apostrophes (`school's`, `doesn't`, `parents'`) and escaping them one at a time
is how you lose an hour. Use a second tag like `$q$…$q$` when a body itself
needs to contain `$md$`.

**Never use double quotes for a string in this SQL.** In Postgres `"like this"`
is an *identifier*, not a string. A body containing `"campaigns"` pasted into a
double-quoted context fails with `column … does not exist`.

### Component cheat sheet

Directives go at the **very top** of the body, one per line, and end at the
first line that is not a directive. No directives at all = `prose`.

| Component | Aliases | Body shape |
|---|---|---|
| `prose` | `text`, `markdown` | Markdown. The default. |
| `metrics` | `stats` | per line: `value \| label \| note` (note optional) |
| `callout` | `note` | Markdown. Takes `@tone:` |
| `cards` | `grid` | `### Title \| badge` then body, repeated. Takes `@columns:` |
| `steps` | `timeline`, `phases` | `### Title \| when` then body, repeated |
| `keyvalue` | `facts` | per line: `term \| value` |
| `quote` | `pull` | the quote; a last line starting `— ` is the attribution |
| `table` | — | a markdown table |
| `figure` | `image` | `![alt](https://…)` plus caption, or `@src:` |
| `svg` | `diagram` | inline `<svg>…</svg>`, plus caption text after it |

| Directive | Applies to | Values |
|---|---|---|
| `@component:` | any | a name above |
| `@width:` | any | `text`, `wide`, `full` |
| `@tone:` | `callout` | `note` (default), `warn`, `good`, `quiet` |
| `@columns:` | `cards` | `1`–`4`. Phones always get one column regardless |
| `@src:`, `@alt:` | `figure` | an `https://` URL, and alt text |
| `@label:` | `svg` | what the diagram shows, for a screen reader |
| `@section-closed` / `@section-open` | any | that block's whole section starts collapsed / open |

A mistyped directive costs you the component, never the content — the body falls
back to `prose` with the original text intact. Which means **a broken component
is silent**. Check the render, do not assume.

### Converting the HTML to markdown

- Unescape the entities. `&mdash;` → `—`, `&amp;` → `&`, `&middot;` → `·`,
  `&#1513;&#1499;&#1512;` → `שכר`. A body full of `&mdash;` renders as literal
  `&mdash;` — markdown escapes raw HTML rather than interpreting it.
- `<strong>` → `**bold**`, `<em>` → `*italic*`, `<code>` → `` `code` ``.
- Hebrew: the authored page used `<span class="he">` for RTL isolation. That
  class is gone with the CSS. Put the Hebrew in plain, and check it renders
  right-to-left correctly in the preview before you rely on it.
- Do not paste raw HTML into a body hoping it will render. Block bodies go
  through `marked` **with raw HTML escaped** — a `<div>` shows up as the text
  `<div>`. The only structured markup that survives is the component directives
  and, in an `svg` block, the SVG itself.

---

## 6. `public_meta`

Currently `{}`. It drives the masthead the authored page had hard-coded.

```sql
update projects set public_meta = $j${
  "eyebrow": "Los Angeles, CA",
  "heading": "Replacing the system, without risking a school year",
  "subheading": "A staged replacement of Graphite Education for Cheder Menachem and Bais Chaya Mushka.",
  "prepared_for": "The leadership of Cheder Menachem & Bais Chaya Mushka",
  "prepared_by": "Mendy Ezagui · Aventary",
  "brand": { "name": "Cheder Menachem", "accent": "#RRGGBB" },
  "layout": { "collapse": "open" }
}$j$::jsonb
where id = 10013;
```

**On `accent`:** it must be hex; anything else falls back to Aventary teal. Ask
Mendy for the school's colour rather than guessing — MYEF's `#007A00` was a
specific instruction, not a default. If you have no answer, leave `brand` out
entirely: a monogram in the default accent is better than a wrong colour.

**Do not add a `logo` under `brand`** unless the school genuinely needs a
project-specific mark. The logo is supposed to come from the CRM.

---

## 7. The logo, the readers, and the company

### Logo — set it on the **company**, never the project

`project-page-feed` resolves `companies.logo_url` through the project's
`companyId` on every request. Set it once on company `171` and every project for
that school gets the same mark, and a rebrand is one edit. A `brand.logo` in
`public_meta` overrides it and is how the two drift apart.

In Second Brain the Logo field on the company record uploads to the
`client-logos` bucket and stores the URL. Do it through the app if you can.

> **`client-logos` is a public bucket.** Anyone holding the bare URL can fetch
> the file. Do not put anything there that would embarrass the client or us.

No logo anywhere renders a monogram in the accent colour, never a blank space.
That is an acceptable outcome — do not block the migration on a logo.

### Readers

The reader list for a page is the **union** of `client_pages.allowed_emails`
(website DB) and `projects.page_readers` (Second Brain). Use `readersFor()` in
`lib/client-pages.ts` — reading `allowed_emails` directly misses half of them.

Today the two lists disagree:

| Source | Addresses |
|---|---|
| `client_pages.allowed_emails` | `mendy@aventary.com`, `rabbichein@chedermla.com` |
| `projects.page_readers` (10013) | `rabbichein@chedermla.com` |

The union already covers both, so **nothing is broken and nothing must change**.
But add `mendy@aventary.com` to `page_readers` anyway so the project's own list
is self-sufficient and Client Hub shows the truth:

```sql
update projects
set page_readers = array(select distinct unnest(page_readers || array['mendy@aventary.com']))
where id = 10013;
```

**Confirm the reader list with Mendy before publishing.** Do not add an address
to a client document on your own judgement.

---

## 8. The sequence diagram — the part that will bite you

Section 04 contains a ~900×470 inline SVG: ten module rows showing Graphite
handing over to the new system stage by stage. It is the best thing on the page.
Three separate traps:

### Trap 1 — it is painted in CSS variables that will not exist

The SVG uses `fill="var(--accent-soft)"`, `var(--surface-3)`, `var(--brass)`,
`var(--brass-soft)`, `var(--rule-strong)`, `var(--ink-2)`, `var(--ink-3)`.
Those resolve today because the whole document sits inside `.lcla`.

In the block template, `client-doc.css` defines `--accent`, `--accent-soft`,
`--accent-2`, `--accent-line`, `--brass`, `--rule`, `--rule-strong`, `--ink`,
`--ink-2`, `--ink-3`, `--surface`, `--surface-2`, `--flag`, `--flag-soft`.

**`--surface-3` and `--brass-soft` are not defined there.** Grep before you
trust this list:

```bash
grep -o '\-\-[a-z0-9-]*:' 'app/c/[slug]/client-doc.css' | sort -u
```

An undefined custom property in `fill` makes the fill invalid, which for SVG
means the bars render **black**. Every "Graphite in use" bar and the hatch
pattern go black and the diagram becomes unreadable. Either:

- substitute the two missing ones with defined tokens (`--surface-2` for
  `--surface-3`, a `--brass` at low opacity for `--brass-soft`), or
- hard-code literal hex for those two.

Keep `var(--accent)` and `var(--accent-soft)` — those are the ones that make the
diagram pick up the client's colour, which is the whole point of having it.

### Trap 2 — the sanitizer rebuilds the SVG by allowlist

`lib/client-doc/svg.ts` drops every element and attribute not on its list.
`pattern`, `patternTransform`, `defs`, `text`, `tspan`, `rect`, `line` and
`stroke-dasharray` are all allowed, so this diagram should survive — but
**render it and look at it**, do not assume. Anything dropped disappears
silently.

### Trap 3 — the accessible name

The wrapper gets `role="img"` + `aria-label` when the block has a label, and
that **replaces everything inside it** for a screen reader. The parser already
handles this: if the SVG carries its own `aria-label` or a `<title>` that is a
direct child of `<svg>`, `svgAccessibleName()` finds it and the wrapper does not
add a competing one.

This SVG already has a good `aria-label` on the `<svg>` element. **Keep it, and
do not also add `@label:`** — you would be naming the same thing twice.

### Body shape

```
@component: svg
@width: full

<svg viewBox="0 0 900 470" role="img" aria-label="A sequence showing each module moving from Graphite to the new system one at a time, starting with tuition assistance and ending with billing, which runs in both systems in parallel for a full year rather than cutting over.">
  …
</svg>

The proposed *order*, not a schedule — how long each stage takes is exactly what
discovery is for. …
```

Caption text goes **after** the closing `</svg>`.

---

## 9. Preview before you touch the repo

There is a harness that renders the real template with no database and no
deploy. Use it after every few blocks, not once at the end.

Build a fixture in the shape the feed returns, **outside the repo**:

```bash
mkdir -p /tmp/lcla-preview
# fixture: { name, client, meta, blocks:[{tab,title,body,format,sort}, …] }
AVDOC_FIXTURE=/tmp/lcla-preview/lcla.json \
AVDOC_OUT=/tmp/lcla-preview/lcla.html \
npm run preview:doc
```

It prints a line like `4 sections, 6 blocks: prose, metrics, callout, svg, cards,
prose`. **Read that line.** If a block you wrote as `cards` comes back as
`prose`, the directive did not parse and you found it in two seconds instead of
in front of the client.

Then screenshot it — Chromium is pre-installed at `/opt/pw-browsers/chromium`
and Playwright is in `node_modules`:

```js
import { chromium } from "/home/user/aventary/node_modules/playwright-core/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1280, height: 1200 }, deviceScaleFactor: 2 });
await p.goto("file:///tmp/lcla-preview/lcla.html", { waitUntil: "networkidle" });
await p.screenshot({ path: "/tmp/lcla-preview/lcla.png", fullPage: true });
await b.close();
```

Look at it. Specifically check: the diagram's colours, the 10-row table on a
narrow viewport, the Hebrew, and whether any card grid has an awkward orphan.

**Keep the fixture and the output out of the repository.** That is what the two
environment variables are for — these are confidential client documents.

---

## 10. The cutover commit

Only once the blocks are in, the preview looks right, and Mendy has said go.

1. **Delete** `content/clients/lcla.ts`.
2. **Edit** `content/clients/index.ts` — remove the `import { html as lcla }`
   line and the whole `lcla: { … }` entry from `CLIENT_PAGES`.
3. **Edit** `app/c/[slug]/client-page.css` — delete the `.lcla` block (the
   header comment through the last `.lcla` selector, ~lines 1–148). **Keep
   everything from `.cp-gate` down.** That is the sign-in gate for every page.
4. **Leave** the `/lcla → /c/lcla` redirect in `next.config.mjs`.
5. Run the checks:

```bash
npm run typecheck     # index.ts is typed; a stale import fails here
npm run check:doc     # the doc-library safety assertions
npm run lint
npm run build         # the real proof the CSS deletion did not break a page
```

6. Commit on the branch you were told to develop on, and push with
   `git push -u origin <branch>`. **Cloudflare Workers Builds deploys every
   push automatically** — the GitHub workflow in `.github/workflows/deploy-site.yml`
   is a manual escape hatch and must not be run alongside it.

Commit message, something like:

```
Serve Cheder Menachem from Client Hub instead of a file

/c/lcla was the last inline-mode authored page: a single HTML string
plus 99 scoped CSS selectors, both of which had to be deployed to
change a sentence. The document now lives as blocks on project 10013
and renders through the shared template, so an edit in Client Hub is
live on reload and the page picks up every later improvement to the
design system.

The .lcla CSS goes with it; .cp-gate and the rest of client-page.css
stay, because that is the sign-in gate for every client page.
```

---

## 11. Verify, at the endpoint, not the row

`page_published = true` does **not** mean public. It means "servable through
`project-page-feed`", which refuses every request without `PAGE_FEED_SECRET`.
The website gates whatever it gets. **Verify a claim like that against the
endpoint, never the row.**

After the deploy lands:

```bash
curl -s -o /tmp/live.html -w '%{http_code}\n' https://aventary.com/c/lcla
```

Expect `200` and the **sign-in gate** — "Your email / Email me a sign-in link".
That is correct: an unauthenticated request should never see the document.

Then check what you cannot see from here, and say plainly that you could not:

- Signed in as a reader, the document renders with all its sections.
- The old `/lcla` redirect still lands on the gate.
- Nothing else in `content/clients/` broke — `bbdc` is `mode: "document"` and
  renders in an iframe, so it never used the `.lcla` CSS, but confirm it loads.

```sql
-- sanity, on Second Brain
select count(*) filter (where visibility = 'public') as public_blocks,
       count(*) as total,
       count(distinct tab) as sections
from project_blocks where project_id = 10013;
```

Public blocks must be **> 0** or the feed refuses the project and `/c/lcla`
404s for a named reader.

---

## 12. Rollback

Before the cutover commit: nothing to roll back. The authored file is still
winning.

After it: `git revert` the commit and push. The authored file comes back and
wins again immediately. The blocks stay where they are, harmless, shadowed.

Do **not** roll back by setting `page_published = false` — that leaves the repo
with no `lcla` content and the page 404s.

---

## 13. Gotchas, all of them learned the hard way

- **`replace()` in SQL fails silently.** If the search string does not match —
  one wrong line break, one curly apostrophe — the statement succeeds and
  changes nothing. **Always follow an update with a verification query** that
  counts the rows now containing the new text. Assume nothing landed until a
  `select` says it did.
- **Check a `sort` is free before inserting into it.** An insert guarded on a
  sort that is already taken no-ops without complaint.
- **`visibility`, not `is_public`.** The column name is `visibility`.
- **Private blocks are internal notes.** Competitor intel, pricing strategy, your
  read of the room — none of it may ever be `public`. Before you flip any block
  to public, read it as the client. On `/c/myef`, internal material reached two
  fallback sources and sat there with the client's own address on the reader
  list.
- **Apostrophes:** `$md$…$md$`. **Double quotes in SQL are identifiers**, not
  strings.
- **`xwacfwagyhgbbhefecdt` is a frozen read-only archive.** Its 19 CRM tables
  refuse every write. If a write there fails, that is working as intended —
  point the writer at `secondbrain-os`, do not lift the freeze. See
  `docs/crm-freeze.md`.
- **Two databases, colliding ids.** `projects.10010` and `contacts.206` are
  different records in each. `docs/second-brain-data-map.md` says which is
  which. Project **10013** in this runbook means the one in
  `fukehjqikxqsntwhmgsk`.
- **Prefer `apply_migration` over `execute_sql`** for anything that writes, so
  the change is named and recorded.
- **Do not run `soffice`/LibreOffice here.** It cannot open a pptx in this
  sandbox and fails on a trivial file too — irrelevant to this job, but it will
  waste your time if you reach for it.
- **Never disable TLS verification and never unset `HTTPS_PROXY`.** If a fetch
  fails, read `/root/.ccr/README.md`.

---

## 14. Doing this for `bbdc` afterwards

`bbdc` is the other authored page. It differs in one way that matters: it is
`mode: "document"` — a full standalone HTML document rendered in a **sandboxed
iframe**, with its own `<style>`. So:

- There is no scoped CSS in `client-page.css` to delete; its styles are inside
  the document.
- `DocFrame` additionally checks, once loaded, that the frame is showing the
  document the URL asked for. That check disappears with the frame — which is
  fine, because a structured document has no `srcDoc` to go stale, and the React
  `key` is the defence that applies instead.
- Check whether a Second Brain project exists for Brown Bag Direct before
  assuming you must create one. For Cheder Menachem, one already did — and
  finding that out first saved creating a duplicate.

The rest of this runbook applies unchanged.
