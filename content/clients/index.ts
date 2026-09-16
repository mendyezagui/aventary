import type { ClientDocument } from "@/lib/client-doc";
import { html as lcla } from "./lcla";
import { html as bbdc } from "./bbdc";

// The registry of client pages. Adding one is: drop a `<slug>.ts` file next to
// this one that exports its HTML, add a line here, and insert a row in
// `client_pages` with the addresses allowed to read it. See docs/client-pages.md.
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
   * "inline" (default): `html` injected into a `.<slug>` div; its CSS lives,
   *   scoped, in client-page.css (the lcla model).
   * "document": `html` is a full standalone HTML document, rendered in an
   *   isolated iframe so its own <style> can't touch — and isn't touched by —
   *   the site. Hand-written pages only; sandboxing them is why this exists.
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

export const CLIENT_PAGES: Record<string, ClientPageContent> = {
  lcla: {
    title: "Replacing Graphite",
    blurb:
      "A proposal prepared for the leadership of Cheder Menachem and Bais Chaya Mushka.",
    html: lcla
  },
  bbdc: {
    title: "Aventary × Brown Bag Direct — Discovery Engagement",
    blurb: "A discovery-engagement proposal prepared for Brown Bag Direct Marketing.",
    html: bbdc,
    mode: "document"
  }
};

export const CLIENT_SLUGS = Object.keys(CLIENT_PAGES);
