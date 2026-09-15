import { Marked } from "marked";

/** HTML-escape, for anything interpolated into markup. */
export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Markdown means markdown. marked passes raw HTML straight through by default,
// so a <script> typed into a block body would run in the reader's browser.
// These bodies are authored by the owner rather than a client, so this is not
// the likeliest attack — but the document is assembled from database rows and
// shown to someone outside the company, and "the person typing is trusted" is
// not a property worth depending on. Both block-level and inline HTML tokens
// render as visible text instead.
const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }: { text: string }) {
      return esc(text);
    }
  }
});

// A table is the one thing in a block body that legitimately wants to be wider
// than its column, so it scrolls in its own box rather than pushing the page
// sideways on a phone. marked has no hook for wrapping a finished table, so it
// happens on the way out.
const wrapTables = (html: string) =>
  html
    .replace(/<table>/g, '<div class="avd-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>");

/** Block-level markdown — paragraphs, lists, tables. */
export const md = (src: string) => wrapTables(marked.parse(src, { async: false }) as string);

/**
 * Inline markdown, with no wrapping <p>. For the short strings inside a
 * structured component — a metric's label, a card's title — where a paragraph
 * would break the layout but **bold** and `code` still need to work.
 */
export const mdInline = (src: string) => marked.parseInline(src, { async: false }) as string;

/** Strip markdown emphasis to plain text, for attributes and ids. */
export const plain = (src: string) =>
  src
    .replace(/[*_`~]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
