import { resolveBrand, type DocBrand } from "./brand";
import { parseBlock, readDirectives, type DocBlock, type RawBlock } from "./parse";
import { plain } from "./markdown";

// Assembling a whole client document.
//
// The template. There is one, and it is this shape:
//
//   masthead   — logo lockup, confidentiality line, date
//   hero       — eyebrow, title, standfirst, prepared-for / prepared-by
//   nav        — the section list, when there are enough sections to need one
//   sections   — numbered, collapsible, each a stack of components
//   signoff    — who prepared it, when, for whom
//   footer     — Aventary
//
// You do not choose a template. You choose COMPONENTS, per block, and the
// document's own furniture appears or does not according to what the project
// actually has. A project with no prepared-for gets no prepared-for line rather
// than an empty label; a two-section document gets no section nav, because a
// contents list for two things is furniture pretending to be navigation.

export type CollapseMode = "open" | "after-first" | "all" | "never";

export type DocLayout = {
  /** How sections start. `open` means collapsible but nothing starts closed. */
  collapse: CollapseMode;
  /** The jump-to-section list. */
  nav: boolean;
  /** Numbered sections — 01, 02, 03. */
  numbered: boolean;
  /** `compact` tightens the vertical rhythm for a dense, factual document. */
  density: "comfortable" | "compact";
};

export type DocSection = {
  id: string;
  /** 1-based. The number shown when `numbered` is on. */
  index: number;
  title: string;
  blocks: DocBlock[];
  /** Whether this one starts closed. */
  startsCollapsed: boolean;
};

export type ClientDocument = {
  title: string;
  blurb: string;
  eyebrow: string;
  preparedFor: string;
  preparedBy: string;
  date: string;
  brand: DocBrand;
  layout: DocLayout;
  sections: DocSection[];
};

export type DocMeta = {
  heading?: unknown;
  subheading?: unknown;
  prepared_by?: unknown;
  prepared_for?: unknown;
  eyebrow?: unknown;
  brand?: unknown;
  layout?: unknown;
};

const str = (v: unknown, fallback = "") =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

const COLLAPSE: CollapseMode[] = ["open", "after-first", "all", "never"];

/**
 * Layout options, with defaults chosen for a document somebody was sent and is
 * about to read for the first time.
 *
 * `collapse: "open"` is the default and the important one. Sections are
 * collapsible — that is what was asked for — but none of them starts closed,
 * because hiding a proposal's substance behind disclosure triangles asks a
 * client to go looking for the thing you sent them. The affordance is for the
 * second read, when they want the pricing again and not the preamble.
 *
 * `nav` defaults on only past three sections: a contents list for two is
 * decoration.
 */
export function resolveLayout(raw: unknown, sectionCount: number): DocLayout {
  const l = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const collapse = COLLAPSE.includes(l.collapse as CollapseMode)
    ? (l.collapse as CollapseMode)
    : "open";
  return {
    collapse,
    nav: typeof l.nav === "boolean" ? l.nav : sectionCount >= 3,
    numbered: typeof l.numbered === "boolean" ? l.numbered : true,
    density: l.density === "compact" ? "compact" : "comfortable"
  };
}

const sectionId = (title: string, index: number) =>
  `s${index}-${plain(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "section"}`;

/**
 * Group blocks into the sections they were authored as, in the order Client Hub
 * shows them, and parse each block into its component.
 *
 * A block may override its own section's collapsed state with `@section-closed`
 * or `@section-open`, which is how one long appendix gets folded away in a
 * document whose other sections stay open without turning that into a per-page
 * setting nobody remembers exists.
 */
export function buildSections(raw: RawBlock[], layout: CollapseMode): DocSection[] {
  const order: string[] = [];
  const byTab = new Map<string, RawBlock[]>();

  for (const b of raw) {
    const tab = (b.tab || "").trim() || "Overview";
    if (!byTab.has(tab)) {
      byTab.set(tab, []);
      order.push(tab);
    }
    byTab.get(tab)!.push(b);
  }

  let n = 0;
  return order.map((tab) => {
    const blocks = byTab.get(tab)!.slice().sort((a, b) => a.sort - b.sort);
    const index = ++n;

    const hints = blocks.map((b) => readDirectives(b.body).directives);
    const forcedClosed = hints.some((d) => "section-closed" in d || "section-collapsed" in d);
    const forcedOpen = hints.some((d) => "section-open" in d);

    const byMode =
      layout === "all" ? true : layout === "after-first" ? index > 1 : false;

    return {
      id: sectionId(tab, index),
      index,
      title: tab,
      blocks: blocks.map((b, i) => parseBlock(b, i)),
      startsCollapsed: layout === "never" ? false : forcedOpen ? false : forcedClosed || byMode
    };
  });
}

/**
 * The whole document, from a project's meta and its public blocks.
 *
 * Everything optional is genuinely optional. A project that sets nothing but a
 * name and some blocks renders as a clean Aventary document; each field added
 * to public_meta turns on one more piece of furniture. There is no required
 * configuration, so publishing never fails on a missing setting.
 */
export function buildDocument(input: {
  name: string;
  client: string | null;
  meta: DocMeta;
  blocks: RawBlock[];
  now?: Date;
}): ClientDocument {
  const meta = input.meta ?? {};
  const title = str(meta.heading, input.name);
  const client = str(input.client);
  const preparedFor = str(meta.prepared_for, client);

  const brand = resolveBrand(meta.brand, preparedFor || client || input.name);
  const layout = resolveLayout(meta.layout, new Set(input.blocks.map((b) => b.tab)).size);

  return {
    title,
    blurb: str(meta.subheading),
    eyebrow: str(meta.eyebrow, client),
    preparedFor,
    preparedBy: str(meta.prepared_by, "Mendy Ezagui · Aventary"),
    date: (input.now ?? new Date()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }),
    brand,
    layout,
    sections: buildSections(input.blocks, layout.collapse)
  };
}
