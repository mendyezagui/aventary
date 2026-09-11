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
  html: string;
  /**
   * How `html` is rendered once the reader is signed in.
   * "inline" (default): injected into a `.<slug>` div; its CSS lives, scoped,
   *   in client-page.css (the lcla model).
   * "document": a full standalone HTML document, rendered in an isolated
   *   iframe so its own <style> can't touch — and isn't touched by — the site.
   */
  mode?: "inline" | "document";
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
