# Client document images

Images referenced by a `figure` block in a client document at `/c/<slug>`.

A `figure` body is `![alt](https://…)`, and `lib/client-doc/parse.ts` refuses
anything that is not `https://` — no `data:` URIs, so an image cannot be
inlined into a block. It has to be fetched from somewhere, and this is that
somewhere: versioned next to the document, deployed with the site.

**These files are public.** `/c/<slug>` is gated; an image the page loads is
not, and there is no authenticated asset route in this repo. Anyone with the
URL can fetch one without signing in. Do not put anything here that the client
would not want a stranger holding — pricing, internal notes, a comp for a deal
that is still confidential.

## myef-homepage-comp.webp

The homepage design direction for My Extended Family, referenced from §06 of
the `myef` document. Rendered from the Claude Design artifact
`LGqsUgtNuf2ZZzZWtCrvV8` at 1440 CSS px, 2× device scale, full page, then
resized to 1920 wide.

Two things are changed between the artifact and this file, both at render time,
because the artifact itself is 11MB of inlined base64 and cannot practically be
read back in order to republish it:

1. The runtime's `#__claude_design_branding` node is removed. It is chrome the
   artifact runtime adds around the design, not part of the design, and it has
   no business in a client proposal. Remove it by id — matching on its text
   leaves the dismiss button behind as a stray glyph in the corner.
2. The counters are set to the audited figures. The artifact was built before
   the recount and reads 6 / 20+ / 400+; §03 of the document reports the live
   homepage as 6 / 18 / 703. Handing a client a comp that undercounts the
   children served, in a document whose whole argument is verified counts,
   gives away the advantage the audit bought. Each counter is matched by its own
   label before it is rewritten, so nothing is edited by position.

**The artifact still holds the old numbers.** Fix them in Claude Design when
convenient, or this divergence will bite whoever renders it next.

Not changed, because there is no verified source to change them to — flagged for
a human rather than guessed at: the hero reads `Brooklyn · Since 2011`, the
footer carries `(347) 815-MYEF` and `Brooklyn, NY 11234`, and there is an
"Avi Yesomim" card that is not among the eight service lines in §03. All the
photography is placeholder gradient, not MYEF's own.

Re-render with `scripts/` — the render script lives in the session scratchpad,
not the repo; it is ~60 lines of Playwright and is cheaper to rewrite than to
maintain. What matters is recorded above.
