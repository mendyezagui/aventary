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

### Directives

| Directive | Applies to | Values |
|---|---|---|
| `@component:` | any | a name from the table above |
| `@width:` | any | `text`, `wide`, `full` |
| `@tone:` | `callout` | `note` (default), `warn`, `good`, `quiet` |
| `@columns:` | `cards` | `1`–`4`. Ignored on phones, which always get one |
| `@src:`, `@alt:` | `figure` | an `https://` URL, and alt text |
| `@section-closed` | any block | that block's whole section starts collapsed |
| `@section-open` | any block | that block's whole section starts open |

**A mistyped directive costs you the component, never the content.** A body that
does not parse as the component it names falls back to prose with the original
text in it. A client opening a proposal always sees the paragraph somebody
wrote.

---

## The page

`projects.public_meta`, in Client Hub. Every field is optional.

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
- The hover/pressed shade is **derived** from the accent, not asked for. One
  colour and a rule cannot drift; two colours per client eventually will.

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

## Where the code is

| | |
|---|---|
| Design tokens, the three rules written down | `lib/client-doc/tokens.ts` |
| Per-client brand, and its validation | `lib/client-doc/brand.ts` |
| Directives, and one parser per component | `lib/client-doc/parse.ts` |
| Assembling sections and the page | `lib/client-doc/document.ts` |
| The page | `components/client-doc/ClientDoc.tsx` |
| One branch per component | `components/client-doc/DocBlock.tsx` |
| Contents rail and expand/collapse | `components/client-doc/DocControls.tsx` |
| The stylesheet | `app/c/[slug]/client-doc.css` |
| Fetching the project | `lib/project-pages.ts` |

The switch in `DocBlock.tsx` is exhaustive over the component union, so adding a
component to `parse.ts` makes TypeScript point at the renderer until it has one.
The two halves of the registry cannot drift apart.

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
