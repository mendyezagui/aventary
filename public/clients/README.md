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

The artifact's own "Made with Claude Design" badge is removed before capture.
It is chrome the runtime adds around the design, not part of the design, and it
has no business in a client proposal.

The comp's counters read 6 / 20+ / 400+. The document's audit says the live
homepage reads 6 / 18 / 703. They disagree, and the comp is the one that is
wrong — it was built before the recount. Re-render this file if the artifact is
corrected.
