import { html as lcla } from "./lcla";

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
};

export const CLIENT_PAGES: Record<string, ClientPageContent> = {
  lcla: {
    title: "Replacing Graphite",
    blurb:
      "A proposal prepared for the leadership of Cheder Menachem and Bais Chaya Mushka.",
    html: lcla
  }
};

export const CLIENT_SLUGS = Object.keys(CLIENT_PAGES);
