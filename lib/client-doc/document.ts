import { resolveBrand, type DocBrand } from "./brand";
import { parseBlock, readDirectives, type DocBlock, type RawBlock } from "./parse";
import { plain } from "./markdown";
import { ANCHOR_PREFIX, slugifyAnchor, type Anchor } from "@/lib/doc-anchors";

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

/**
 * Coerce whatever a caller has into blocks the template can render.
 *
 * The feed's rows are already this shape; a jsonb column is whatever was
 * written into it. Every field is defended separately and a row with no body is
 * dropped, because the alternative — throwing — turns one malformed block into
 * a client opening a proposal and finding an error page.
 */
export function normalizeBlocks(input: unknown): RawBlock[] {
  if (!Array.isArray(input)) return [];
  const out: RawBlock[] = [];
  input.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return;
    const b = raw as Record<string, unknown>;
    const body = typeof b.body === "string" ? b.body : "";
    if (!body.trim()) return;
    out.push({
      tab: typeof b.tab === "string" && b.tab.trim() ? b.tab.trim() : "Overview",
      title: typeof b.title === "string" && b.title.trim() ? b.title.trim() : null,
      body,
      format: b.format === "html" ? "html" : "markdown",
      sort: Number.isFinite(b.sort) ? Number(b.sort) : i
    });
  });
  return out;
}

/**
 * The document as text, for grounding the Ask widget.
 *
 * Two things at once, and they have to come from the same walk. The prose is
 * the markdown somebody wrote, which is better context than that markdown
 * rendered to HTML and stripped back to text. The `[section: …]` markers are
 * the citation protocol: the model is told what they mean and cites one back,
 * and that is the whole mechanism behind "Read more here".
 *
 * anchorsOf() below indexes exactly the same ids. An index naming an id the
 * text does not contain would produce a citation pointing at nothing.
 */
export function documentSource(doc: ClientDocument): string {
  const parts: string[] = [];
  for (const section of doc.sections) {
    parts.push(`[section: ${section.id}]`);
    parts.push(`## ${section.title}`);
    for (const block of section.blocks) {
      if (block.title) {
        parts.push(`[section: ${block.id}]`);
        parts.push(`### ${block.title}`);
      }
      if (block.source.trim()) parts.push(block.source.trim());
    }
  }
  return parts.join("\n\n").trim();
}

/**
 * Every place in this document a citation may point, and what to call it.
 *
 * Sections always, and blocks that have a title. A block without one has no
 * words to offer as a link label, and "Read more here" with nothing to name is
 * worse than citing the section around it.
 *
 * Unlike the HTML documents, nothing is scraped: these ids were assigned when
 * the document was built and are what ClientDoc renders. There is no pass over
 * finished markup that could disagree with what is on the page.
 */
export function anchorsOf(doc: ClientDocument): Anchor[] {
  const out: Anchor[] = [];
  for (const section of doc.sections) {
    out.push({ id: section.id, label: section.title });
    for (const block of section.blocks) {
      if (block.title) out.push({ id: block.id, label: block.title });
    }
  }
  return out;
}

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
 * `nav` defaults on from two sections. A contents list for one section is
 * decoration, but two is already a document somebody scrolls — a page with two
 * tabs can still have seven blocks under the first of them.
 */
export function resolveLayout(raw: unknown, sectionCount: number): DocLayout {
  const l = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const collapse = COLLAPSE.includes(l.collapse as CollapseMode)
    ? (l.collapse as CollapseMode)
    : "open";
  return {
    collapse,
    nav: typeof l.nav === "boolean" ? l.nav : sectionCount >= 2,
    numbered: typeof l.numbered === "boolean" ? l.numbered : true,
    density: l.density === "compact" ? "compact" : "comfortable"
  };
}

/**
 * Assigns the anchor ids for one document.
 *
 * Shares the prefix and the slug rule with lib/doc-anchors, which derives the
 * same kind of id from finished HTML for the other two sources. A citation
 * looks identical whichever produced the page, and nothing downstream — the
 * prompt, the SOURCE marker, the reveal — has to know the difference.
 */
function anchorIds() {
  const taken = new Set<string>();
  return (label: string, fallback: string) => {
    const base = slugifyAnchor(plain(label)) || fallback;
    let id = ANCHOR_PREFIX + base;
    for (let n = 2; taken.has(id); n++) id = `${ANCHOR_PREFIX}${base}-${n}`;
    taken.add(id);
    return id;
  };
}

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
  const nextId = anchorIds();

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

    // Ids are assigned here rather than in parseBlock because uniqueness is a
    // property of the whole document, not of one block: two sections may both
    // hold a block called "What it costs".
    const id = nextId(tab, `section-${index}`);
    const parsed = blocks.map((b, i) => {
      const block = parseBlock(b, i);
      return { ...block, id: nextId(block.title ?? `${tab} ${i + 1}`, `${id.slice(ANCHOR_PREFIX.length)}-${i + 1}`) };
    });

    return {
      id,
      index,
      title: tab,
      blocks: parsed,
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
