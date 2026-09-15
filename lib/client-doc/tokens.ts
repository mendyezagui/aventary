// The design system for client documents at /c/<slug>.
//
// This file is the written-down version of decisions that used to live as
// magic numbers inside one CSS string. It is deliberately data, not CSS: the
// stylesheet (app/c/[slug]/client-doc.css) declares the same names as custom
// properties, and this module is what the rest of the code reads when it needs
// to reason about a value rather than just emit it.
//
// Three rules hold the system together. Break one and the page goes back to
// looking arbitrary.
//
// 1. WIDTH IS A PROPERTY OF CONTENT TYPE, NOT A PER-ELEMENT GUESS.
//    There are exactly three measures and every block declares which one it
//    wants. Prose gets `text`, because a 100-character line is unreadable.
//    Data gets `wide`, because a table squeezed into a prose column is worse
//    than a wide one. Bands get `full`. Nothing invents a fourth width.
//
// 2. THE TYPE SCALE IS MONOTONIC WITH THE DOCUMENT OUTLINE.
//    A section heading is larger than a block heading, which is larger than a
//    sub-heading, which is larger than body text. The previous template had
//    this exactly backwards — section headings were 10.5px mono and the blocks
//    inside them were 25px serif — which is why the structure was unreadable.
//    Mono uppercase is a LABEL, never a heading. It never carries hierarchy.
//
// 3. ONE PALETTE, ONE ACCENT SLOT.
//    Every colour but the accent is fixed Aventary. The accent is the single
//    per-client variable, and it is derived, not hand-picked twice.

/** The three measures. Every block picks one; there is no fourth. */
export const MEASURES = {
  /** Prose. ~68 characters, the readable line length. */
  text: "var(--measure-text)",
  /** Tables, metric rows, card grids — data that needs room but not the page. */
  wide: "var(--measure-wide)",
  /** Edge to edge within the shell. Bands, rules, full-bleed figures. */
  full: "var(--measure-full)"
} as const;

export type DocWidth = keyof typeof MEASURES;

export const WIDTHS = Object.keys(MEASURES) as DocWidth[];

export const isWidth = (v: unknown): v is DocWidth =>
  typeof v === "string" && (WIDTHS as string[]).includes(v);

/**
 * What each component wants when nothing says otherwise. A block can override
 * with `@width:`, but the default is the right answer often enough that most
 * blocks never say.
 */
export const DEFAULT_WIDTH: Record<string, DocWidth> = {
  prose: "text",
  callout: "text",
  quote: "text",
  metrics: "wide",
  cards: "wide",
  steps: "wide",
  keyvalue: "wide",
  table: "wide",
  figure: "full",
  svg: "wide"
};

/**
 * The type scale, as a reference. The stylesheet carries these as custom
 * properties; they are listed here so the hierarchy can be read in one place
 * and reviewed as a whole rather than found scattered through a stylesheet.
 *
 * `role` is what the size MEANS. Nothing should use a size whose role does not
 * describe the thing being set — that is how a section heading ends up at
 * label size.
 */
export const TYPE_SCALE = [
  { token: "--t-display", role: "Document title, once per page", size: "clamp(2.1rem, 5vw, 3.15rem)", face: "serif" },
  { token: "--t-section", role: "Section heading — names a whole numbered section", size: "clamp(1.45rem, 3.2vw, 1.85rem)", face: "serif" },
  { token: "--t-block", role: "Block heading inside a section", size: "1.2rem", face: "serif" },
  { token: "--t-sub", role: "Sub-heading within a block body", size: "1.01rem", face: "sans" },
  { token: "--t-lede", role: "Standfirst under the title", size: "1.12rem", face: "sans" },
  { token: "--t-body", role: "Running text", size: "1rem", face: "sans" },
  { token: "--t-small", role: "Captions, notes, secondary detail", size: ".88rem", face: "sans" },
  { token: "--t-label", role: "Mono uppercase label — never a heading", size: ".72rem", face: "mono" }
] as const;

/** The spacing scale. A 4px base; nothing off-scale. */
export const SPACE = ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px", "96px"] as const;

/**
 * The fixed part of the palette. Identical to the portal shell (.pl) and the
 * authored lcla document, which is the point: before this, project documents
 * used a different serif, a different sans and a slightly different teal from
 * the page that framed them, so the iframe and its surroundings read as two
 * companies.
 */
export const PALETTE = {
  ground: "#FAF8F3",
  surface: "#FFFFFF",
  surface2: "#F2EEE4",
  ink: "#14212B",
  ink2: "#4A5860",
  ink3: "#7C8992",
  rule: "#DFD7C6",
  ruleStrong: "#C8BEA8",
  brass: "#9C6E22",
  flag: "#9E3A2C"
} as const;
