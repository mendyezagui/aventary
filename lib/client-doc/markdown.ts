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
// Link and image targets are allowlisted by scheme.
//
// Escaping raw HTML is not enough on its own: `[click me](javascript:alert(1))`
// is ordinary markdown, and marked emits the href unchanged, so it becomes a
// live <a href="javascript:..."> in a page served from aventary.com — the
// origin holding the cp_<slug> page session and the portal session. data: is
// the same story with an extra step. A reader clicking a link inside a
// confidential document is the most ordinary thing they can do.
//
// These bodies come from Client Hub and from the blocks column a generated
// document is written into, so nothing a client types reaches here. That is the
// reason this is a hardening measure rather than an incident, and not a reason
// to leave it: a document is assembled from database rows and shown to someone
// outside the company, and "whoever wrote the row is trusted" is not a property
// worth depending on.
const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/** The href if it is safe to emit, or null. */
export function safeUrl(href: unknown): string | null {
  if (typeof href !== "string") return null;
  // Control characters are stripped before the scheme is read: browsers ignore
  // them inside a scheme, so "java\tscript:" and "java\nscript:" both run.
  const raw = href.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  if (!raw) return null;
  // Relative, root-relative and in-page targets carry no scheme.
  if (/^[#/?]/.test(raw)) return raw;
  const scheme = raw.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!scheme) return raw;
  return SAFE_SCHEMES.has(scheme[1].toLowerCase()) ? raw : null;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }: { text: string }) {
      return esc(text);
    },
    link(token: { href: string; title?: string | null; text: string; tokens?: unknown[] }) {
      const inner =
        token.tokens && this.parser
          ? this.parser.parseInline(token.tokens as never)
          : esc(token.text);
      const href = safeUrl(token.href);
      // A refused link keeps its words and loses only the target. Dropping the
      // text as well would silently delete a sentence from a proposal.
      if (!href) return inner;
      const title = token.title ? ` title="${esc(token.title)}"` : "";
      return `<a href="${esc(href)}"${title}>${inner}</a>`;
    },
    image(token: { href: string; title?: string | null; text: string }) {
      const src = safeUrl(token.href);
      if (!src) return esc(token.text);
      const title = token.title ? ` title="${esc(token.title)}"` : "";
      return `<img src="${esc(src)}" alt="${esc(token.text)}"${title} loading="lazy">`;
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
