# The client document template

Everything at `aventary.com/c/<slug>` that comes from a Second Brain project is
built by one template, from a registry of components you pick per block. This
is how you change what is on a page and how the page looks.

Nothing here needs a deploy, a migration, or a change to Second Brain. Block
bodies and `projects.public_meta` are fields that already exist; the template
reads them.

---

## The two things you are choosing

**Components** — what a block *is*. A paragraph, a row of numbers, a warning, a
set of cards, a timeline, a table. You pick one per block by writing a line at
the top of the block body in Client Hub.

**The page** — the accent colour, the logo, whether sections start open or
closed, whether there is a contents rail. One JSON object in `public_meta`.

There is no third thing. There is no template to choose: the document's own
furniture appears when the project has something to put in it and stays away
when it does not.

---

## Components

At the very top of a block body, before anything else:

```
@component: metrics

42% | of inbound leads never get a second touch
11 days | median time to first response | against a 24-hour target
3.1x | close rate when the first reply lands same-day
```

Directives are `@key: value` lines. They end at the first line that is not one.
A block with no directives is `prose`, which is what every block written before
this existed already is — so nothing had to be migrated and nothing broke.

**One separator.** Every structured component splits its parts on `|`. Learn one
and you can guess the rest.

| Component | Aliases | Body shape |
|---|---|---|
| `prose` | `text`, `markdown` | Markdown. The default. |
| `metrics` | `stats` | One per line: `value \| label \| note` (note optional) |
| `callout` | `note` | Markdown. Takes `@tone:` |
| `cards` | `grid` | `### Title \| badge` then body, repeated. Takes `@columns:` |
| `steps` | `timeline`, `phases` | `### Title \| when` then body, repeated |
| `keyvalue` | `facts` | One per line: `term \| value` |
| `quote` | `pull` | The quote; a last line starting `— ` becomes the attribution |
| `table` | — | Markdown table. Same as `prose` but defaults to the wide measure |
| `figure` | `image` | `![alt](https://…)` plus caption text, or `@src:` |
| `svg` | `diagram` | Inline `<svg>…</svg>`, plus caption text after it |

### Directives

| Directive | Applies to | Values |
|---|---|---|
| `@component:` | any | a name from the table above |
| `@width:` | any | `text`, `wide`, `full` |
| `@tone:` | `callout` | `note` (default), `warn`, `good`, `quiet` |
| `@columns:` | `cards` | `1`–`4`. Ignored on phones, which always get one |
| `@src:`, `@alt:` | `figure` | an `https://` URL, and alt text |
| `@label:` | `svg` | what the diagram shows, for a screen reader |
| `@section-closed` | any block | that block's whole section starts collapsed |
| `@section-open` | any block | that block's whole section starts open |

**A mistyped directive costs you the component, never the content.** A body that
does not parse as the component it names falls back to prose with the original
text in it. A client opening a proposal always sees the paragraph somebody
wrote.

### Order: leave gaps in `sort`

A block's `tab` is its section; its `sort` orders it. Both halves of that matter,
and the second one is not what it looks like.

**Inside a section**, blocks run in `sort` order. Straightforward.

**Between sections**, the order is each section's *lowest* `sort` — not an
authored sequence of tabs, because nothing stores one. `project-page-feed`
returns blocks ordered by `tab` and then `sort`, which is to say **alphabetically
by tab name**, and `buildSections` re-ranks them by min-sort to undo that.

Which means the ranking only works where the sorts are actually distinct. Give
every block `sort: 0` and every section ties, the sort is stable, and the
document comes out in the alphabetical order the feed happened to hand over. The
Brown Bag proposal sat like that until 2026-09-16: three tabs, every block at 0,
1 or 2, so it opened on "Phase 01 — Discovery Sprint" before "The engagement".

So **leave gaps, one band per section**:

```
100, 101, 102    The engagement
200              Selected experience
300, 301         Engagement phases
400, 401         Deliverables
```

The bands are what put the sections in order. The gaps inside them are what let
you insert a block later without renumbering its neighbours.

---

## The page

`projects.public_meta` in Client Hub, or the `meta` column on a generated
document. Same object either way. Every field is optional.

```jsonc
{
  "heading":      "Where your deals are leaking",
  "subheading":   "What we discussed, and what the data says.",
  "eyebrow":      "Prime Rock Realty",      // defaults to the project's client
  "prepared_for": "Micah Hiller · Prime Rock Realty",
  "prepared_by":  "Mendy Ezagui · Aventary",

  "brand": {
    "name":   "Prime Rock Realty",
    "accent": "#1F4E79",                    // hex only
    "logo":   "https://primerock.com/logo.svg"
  },

  "layout": {
    "collapse":  "open",                    // open | after-first | all | never
    "nav":       true,                      // defaults on from two sections
    "numbered":  true,
    "density":   "comfortable"              // or compact
  }
}
```

### Branding

Three fields, and they are the only per-client variables on the page. Everything
else is Aventary's and fixed — a document that let each client supply a palette
would stop looking like it came from us, which is the opposite of what a
proposal is for.

- **`accent`** must be hex. It is interpolated into a style attribute, so
  "whatever somebody typed" is not an acceptable input; a regex that only admits
  hex makes the question go away. A bad value falls back to Aventary teal.
- **`logo`** must be an absolute `https://` URL. No logo is fine: the hero shows
  a monogram in the client's accent instead. Never an empty slot — that reads as
  a page that failed to load.
- **`name`** is what the monogram is built from, and it earns its place even when
  you have no colour and no logo. Set it to the client's short name.
- The hover/pressed shade is **derived** from the accent, not asked for. One
  colour and a rule cannot drift; two colours per client eventually will.

**Omitting `brand` entirely is not the safe default it looks like.** With no
`brand`, `resolveBrand` falls back to `prepared_for`, and the monogram is that
string's first and last initials — which is a phrase, not a name. "The leadership
of Cheder Menachem & Bais Chaya Mushka" gives **TM**; "Brown Bag Direct
Marketing" gives **BM**. Both documents were set up with no `brand` at all and
would have rendered exactly that; the preview harness is where it was caught,
which is the argument for rendering one before you publish.

So when you have no accent, still set the name and leave the colour out:

```jsonc
"brand": { "name": "Cheder Menachem" }   // monogram CM, Aventary teal
```

A bad accent falls back to teal on its own, so there is never a reason to invent
a hex. There is also never a reason to omit the name.

### Collapsing

`collapse: "open"` is the default: sections are collapsible, none starts closed.
Hiding a proposal's substance behind disclosure triangles asks a client to go
looking for the thing you sent them. The affordance is for the second read, when
they want the pricing again and not the preamble.

Use `after-first` for a long reference document, `all` for something purely
navigational, and `@section-closed` on one appendix in a document whose other
sections stay open.

The collapsing is native `<details>`. It works with JavaScript disabled, it is
keyboard-operable and screen-reader-announced for free, and **everything opens
when the page is printed**, which matters because these become PDFs.

---

## The design system

`lib/client-doc/tokens.ts` and `app/c/[slug]/client-doc.css`. Three rules hold
it together; break one and the page goes back to looking arbitrary.

### 1. Width is a property of content type, not a per-element guess

Three measures. Every block declares one.

| Measure | What it is for |
|---|---|
| `text` | Prose. ~70 characters, the readable line length |
| `wide` | Tables, metric rows, card grids — data that needs room |
| `full` | Figures and bands, edge to edge within the shell |

Nothing else sets a `max-width`. If an element seems to want one, it wanted a
different measure.

*This is the rule that fixes the old template.* It had four widths and no
system: the column at 920px, the headline capped at `15ch` (halfway across the
page, for no reason a reader could see), the standfirst at `54ch`, and the body
with no limit at all. The shell is now sized so prose and data are a deliberate
step apart rather than two unrelated page widths.

### 2. The type scale follows the outline

Section heading > block heading > sub-heading > body. Mono uppercase is a
**label** and never carries hierarchy.

| Token | Role |
|---|---|
| `--t-display` | Document title, once per page |
| `--t-section` | Section heading — names a whole numbered section |
| `--t-block` | Block heading inside a section |
| `--t-lede` | Standfirst under the title |
| `--t-sub` | Sub-heading within a block body |
| `--t-body` | Running text |
| `--t-small` | Captions, notes, secondary detail |
| `--t-label` | Mono uppercase label. Never a heading |

*This is the rule that fixes "the headers are tiny."* The old template set
section headings at **10.5px mono** and the block headings inside them at
**25px serif** — the most important label on the page was the smallest text on
it, and its own children were 2.4× bigger. The outline was inverted, which is
why the structure could not be read. A section number is still a mono chip; it
sits *beside* a real heading rather than being one.

### 3. One accent slot

`--accent`, `--accent-2`, `--accent-soft` and `--accent-line` are set per client
and are the only dynamic values on the page. Every other colour is fixed.

### A note on client accents

The accent is the client's, but the document's warning tone is not — `--flag`
stays fixed, so a `warn` callout is red whatever the accent is. A client whose
own brand colour is red therefore gets a document where the recommendation and
the thing that cost them a deal look identical, and where every bullet marker on
every list reads as an alarm. Prime Rock Realty is exactly this case.

When a client's brand is red, use Aventary teal and carry their identity with
the logo instead. That is what the logo slot is for.

### One brand, not three

The palette and faces are **identical** to the portal shell (`.pl`) and the
authored `lcla` document: Newsreader, IBM Plex Sans, IBM Plex Mono, `#0E6B68`,
`#FAF8F3` paper.

Before this they were not. Project documents used Fraunces and Karla on white
with `#0E7C66`, inside a page framed by Newsreader and IBM Plex on warm paper
with `#0E6B68`. Two of the three already agreed; the odd one out was the
template every new client got. A reader saw two companies on one screen.

---

## Seeing it

```bash
npm run preview:doc
open preview/client-document-template.html
```

`scripts/preview-client-doc.tsx` renders the template with sample content that
exercises every component. No database, no sign-in, no real client. If you add a
component, add it there too — it is the only place the whole system can be
looked at at once.

**To preview a real project** without its content entering this repository,
write a fixture holding the same `{ name, client, meta, blocks }` shape the feed
returns, and send the output somewhere outside the tree:

```bash
AVDOC_FIXTURE=~/scratch/acme.json AVDOC_OUT=~/scratch/acme.html npm run preview:doc
```

Do this before applying a template to a live page. A published document is
rebuilt from its blocks on every request, so a directive written into Client Hub
is in front of the client on their next reload — including a directive the
deployed site does not understand yet, which renders as literal text at the top
of the section.

---

## Two places a document can come from

The template does not care which.

| | Client Hub project | Generated document |
|---|---|---|
| Blocks live in | `project_blocks` (Second Brain) | `client_page_documents.blocks` (aventary) |
| Page settings | `projects.public_meta` | `client_page_documents.meta` |
| Written by | you, in Client Hub | the Associate |
| Reaches the site via | `project-page-feed` | the service-role client |

A generated row may still carry finished `html` instead, which is served as-is
and gets none of this. That path is kept because two live documents use it and
replacing what a client has already been sent is not a deploy-time decision —
but nothing new should be written that way. See
`.claude/skills/client-document/SKILL.md`.

## Diagrams

A block body may be an inline `<svg>`, with a caption after it. This is the one
place markup reaches the page instead of rendering as text, and it exists
because the documents this template replaced each carried a diagram that was
doing real work — a site map, a migration sequence. Converting those to lists
lost the argument they were making.

Inline rather than a hosted image, deliberately: the diagram inherits the
document's ink and the client's accent, so it themes per client, stays sharp at
any zoom, and can still be edited in Client Hub. A PNG freezes all three.

**The SVG is rebuilt, not filtered.** `lib/client-doc/svg.ts` walks the input,
drops any element not on its allowlist, and re-emits each survivor with only
allowlisted attributes. A blocklist over untrusted markup loses to the first
parser quirk; nothing unrecognised survives here because nothing is copied
through. Specifically refused: `<script>`, `<foreignObject>` (SVG whose children
are HTML), every `on*` handler, `@import`, and any `url()` or `href` pointing
off-document.

Two things to know when authoring one:

- **Attribute case matters.** `viewBox`, `refX`, `gradientUnits` and
  `preserveAspectRatio` are case-sensitive; the sanitizer preserves what you
  wrote. It looks them up folded and emits them as written.
- **Give it an `aria-label`,** or `@label:`. The diagram is announced by it, and
  the Ask widget can answer about a picture it cannot see.

## Safety

`npm run check:doc` asserts what a document must never render, whoever wrote
the row. It is not a formality: escaping raw HTML does not cover
`[click](javascript:alert(1))`, which is ordinary markdown, and marked emits
that href untouched by default. A client document is served from the origin
holding the reader's session cookie.

The check covers link and image schemes (allowlist: http, https, mailto, tel,
and relative or in-page targets), raw HTML in a body, `format: "html"`, the
brand accent and logo — both of which reach a style attribute and an `<img>` —
malformed block rows, and every refusal the SVG sanitizer makes alongside the
diagram content it has to keep. Run it after touching anything in
`lib/client-doc`.

A refused link keeps its words and loses only its target. Deleting a sentence
from a proposal to make a security point is the wrong trade.

## Where the code is

| | |
|---|---|
| Design tokens, the three rules written down | `lib/client-doc/tokens.ts` |
| Per-client brand, and its validation | `lib/client-doc/brand.ts` |
| Directives, and one parser per component | `lib/client-doc/parse.ts` |
| The SVG allowlist | `lib/client-doc/svg.ts` |
| Assembling sections and the page | `lib/client-doc/document.ts` |
| The page | `components/client-doc/ClientDoc.tsx` |
| One branch per component | `components/client-doc/DocBlock.tsx` |
| Contents rail and expand/collapse | `components/client-doc/DocControls.tsx` |
| The stylesheet | `app/c/[slug]/client-doc.css` |
| Fetching the project | `lib/project-pages.ts` |
| Choosing a source, and the generated path | `lib/client-pages.ts` |
| What must never render | `scripts/check-doc-safety.mjs` |

The switch in `DocBlock.tsx` ends in an `exhaustive(block: never)` call, so
adding a component to `parse.ts` makes TypeScript point at the renderer until it
has one. That guard is load-bearing rather than decorative: without it the
switch simply falls out, the return type widens to include `undefined`, and a
new component typechecks clean while rendering nothing. `svg` was added that way
and the build stayed green.

---

## Why this is not in an iframe any more

Project documents used to be a 4KB HTML string built by one function in
`lib/project-pages.ts`, rendered inside an iframe sized to its own
`scrollHeight` with `scrolling="no"`.

That frame is why there was nothing to collapse. A section that opened had no
way to tell the frame it had changed height, and nothing could ever be sticky —
the old stylesheet carried a comment explaining that the top bar had to sit
still. The document is components on the page now, scoped under `.avdoc`.

**Authored pages in `content/clients` keep their iframe**, and should. Those are
hand-written standalone HTML documents with their own `<style>`, and sandboxing
them is the entire reason that path exists.

---

## What still needs doing

**Client Hub has no UI for any of this.** The directives and the `brand` object
are typed into the body and JSON fields by hand, or set with SQL. That works —
it is why this shipped without touching Second Brain at all — but a component
picker and three brand fields in `mendyezagui/secondbrain-app` would write the
same lines, and nothing on this side would change.
