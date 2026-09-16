import type { ClientDocument } from "@/lib/client-doc";

// The registry of hand-authored client pages, and it is deliberately empty.
//
// Both documents that lived here, lcla and bbdc, are Second Brain projects now,
// rendered from blocks through components/client-doc. An authored page had to be
// deployed to change a sentence; a project page is edited in Client Hub and is
// live on reload. Prefer one.
//
// Adding an authored page back is still: drop a `<slug>.ts` file next to this
// one that exports its HTML, add a line here, and insert a row in `client_pages`
// with the addresses allowed to read it. See docs/client-pages.md.
//
// Content is versioned in the repo; who may read it is not. That split is
// deliberate — documents change on a release, allowlists change on a phone call.

export type ClientPageContent = {
  /** Shown in the browser tab and on the sign-in card. */
  title: string;
  /** One line under the title on the sign-in card. */
  blurb: string;
  /** The markup, for the two authored modes. Empty when `doc` is set. */
  html: string;
  /**
   * How this content is rendered once the reader is signed in.
   *
   * "inline" (default): `html` injected into a `.<slug>` div, with its CSS
   *   scoped to that class in client-page.css. No page uses this any more —
   *   lcla was the last, and its styles went with it. A new one would have to
   *   bring its own; prefer "project".
   * "document": `html` is a full standalone HTML document, rendered in an
   *   isolated iframe so its own <style> can't touch — and isn't touched by —
   *   the site. Sandboxing them is why this exists. No page here uses it now
   *   either, but a `client_page_documents` row still can, which is why
   *   DocFrame is not dead code.
   * "project": built from a Second Brain project. `doc` carries the document
   *   as structure and it renders through components/client-doc, on the page
   *   rather than in a frame. See docs/client-document-template.md.
   */
  mode?: "inline" | "document" | "project";
  /** Set only when `mode` is "project". */
  doc?: ClientDocument;
  /**
   * The document as plain text, for the Ask panel's context. Absent for the
   * authored modes, where the text is recovered from `html` by stripping tags.
   */
  text?: string;
};

export const CLIENT_PAGES: Record<string, ClientPageContent> = {};

export const CLIENT_SLUGS = Object.keys(CLIENT_PAGES);
