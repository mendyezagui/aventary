---
name: client-document
description: Publish a client-facing document to aventary.com/c/<slug>. Use whenever you are producing a proposal, discovery brief, audit, findings note or dossier that a named client will read on the website — and before writing any HTML for one, because you should not be writing HTML for one.
---

# Publishing a client document

A document at `aventary.com/c/<slug>` is **content, not markup**. You write
blocks; the website lays them out. Everything about how the page looks — the
type scale, the measures, the section collapsing, the contents rail, the
client's colour and logo — lives in `aventary/lib/client-doc` and is applied
on every request.

**Diagrams are the exception, and only as `svg`.** A block body may be an inline
`<svg>`, which is rebuilt from an allowlist before it reaches the page. Use it
when a picture is doing work a list cannot do — a site map, a migration
sequence. Give it an `aria-label`. Everything else is markdown.

**Do not write HTML.** Two live documents were built that way, each with its
own class names and its own idea of what a section is, and neither can gain a
single improvement made to the design system. A block body is markdown.

Full reference, including every component: `docs/client-document-template.md`
in `mendyezagui/aventary`.

## Where it goes

`client_page_documents` in the **aventary** Supabase project
(`uclyawqdeabjsrejfdlw`). Write `blocks` and `meta`, and leave `html` out
entirely — a structured row has none.

```sql
insert into client_page_documents (slug, title, blurb, blocks, meta, source, generated_by, generated_at)
values ('acme-co', 'Where your pipeline is leaking', 'Discovery findings.',
        $b$[ … ]$b$::jsonb, $b${ … }$b$::jsonb, 'associate', 'Claude (Cowork)', now());
```

A block is `{tab, title, body, format, sort}`. `tab` becomes a numbered
section; blocks sharing a tab are one section, ordered by `sort`.

## Choosing components

A body may open with directive lines. No directive means prose, which is right
for narrative and should stay the majority of any document.

```
@component: metrics

42% | of inbound leads never get a second touch
11 days | median time to first response | against a 24-hour target
```

| Component | Use it for | Body |
|---|---|---|
| *(none)* | narrative, argument, explanation | markdown |
| `metrics` | two to four numbers that carry the finding | `value \| label \| note` per line |
| `callout` | one paragraph that must not be skimmed past | markdown; `@tone: note\|warn\|good\|quiet` |
| `cards` | parallel items of equal weight | `### Title \| badge` + body, repeated; `@columns: 2` |
| `steps` | a sequence, a phased plan, a timeline | `### Title \| when` + body, repeated |
| `keyvalue` | terms and short values — scope, duration, exclusions | `term \| value` per line |
| `quote` | a client's own words | the quote; last line `— Attribution` |
| `table` | a real comparison | markdown table |
| `figure` | an image | `![alt](https://…)` + caption |
| `svg` | a diagram that carries an argument | inline `<svg>…</svg>` + caption after it |

Everything splits on `|`. Add `@width: text\|wide\|full` only to override the
default; the defaults are usually right.

`@section-closed` on any block starts that whole section collapsed — the right
move for an appendix, and the wrong move for anything the client is meant to
read.

## Branding

```jsonc
"brand": { "name": "Acme Co", "accent": "#1F4E79", "logo": "https://acme.com/logo.svg" }
```

Hex only, `https` logo only, both optional. No logo gives a monogram in the
client's accent.

**Do not use a client's accent when it is red.** The warning tone is fixed and
does not move with the accent, so a red accent makes the recommendation and the
thing that cost them money look identical, and turns every bullet into an
alarm. Use Aventary teal and carry their identity with the logo.

## Rules that are not style preferences

**Nothing internal goes in a block.** Pricing bands, close-rate history, what
you think they will pay, notes about the people involved — a block is a thing a
named client reads. Internal context belongs on the company or project record,
marked as such.

**Write the allowlist last, and separately.** A document row with no
`client_pages` row shows "not open yet", which is the correct failure. Create
the document, read it back, then open it to readers:

```sql
insert into client_pages (slug, title, allowed_emails)
values ('acme-co', 'Where your pipeline is leaking', array['someone@acme.com']);
```

**Never overwrite a live document without being asked.** A row whose
`modified_at` is recent is one somebody has been sent. Check before replacing
it, and say what you would be replacing.

**A slug in `content/clients/` always wins.** Authored pages outrank generated
ones, by design. Check before claiming a slug.
