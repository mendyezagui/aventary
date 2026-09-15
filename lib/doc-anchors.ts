// Anchors for client documents, worked out at serve time rather than authored.
//
// The "Ask" widget ends an answer with a link to the passage it came from, and
// a link needs something to point at. Nothing in this system had ids: a project
// page is assembled from Client Hub blocks, and the two hand-built documents in
// content/clients were written without them. Asking whoever writes a proposal
// to also anchor it would mean the citation silently stops working the day
// somebody forgets — so the anchors are derived from the document instead.
//
// One pass over the finished HTML, whatever produced it. Every heading, and
// every element carrying one of the section-label classes our templates use,
// gets an id derived from its own text. The same text gives the same id on
// every request, so a link that worked a minute ago still works after an edit
// elsewhere in the document.
//
// It is deliberately conservative. An element that already has an id is left
// alone and not indexed — a hand-written id is somebody's deliberate choice and
// this has no business overwriting it. A "heading" whose text is empty or
// longer than a heading plausibly is gets skipped, which is how a div that
// happens to share a class name with a label stays out of the index.

export type Anchor = {
  /** The id written into the document, and what the model cites. */
  id: string;
  /** The heading's own words — what the reader is told they are jumping to. */
  label: string;
};

/**
 * Every generated id starts with this. It keeps them out of the way of ids
 * already in a document (lcla numbers its sections `#found`, `#risks`…) and it
 * is what documentText() looks for when it marks up the text for the model.
 */
export const ANCHOR_PREFIX = "cpa-";

/** Tags that can carry an anchor. Headings, plus the boxes our templates label sections with. */
const CANDIDATE_TAGS = "h1|h2|h3|h4|h5|h6|div|span|p";

/**
 * Class names our own documents use for a section label that is not a heading
 * tag. The project-page template labels a section with `.eyebrow`; the
 * hand-built bbdc proposal uses `.section-eyebrow`, `.phase-title`, `.col-title`
 * and `.wg-label`; lcla uses `.kicker`. A document that uses none of them still
 * gets its headings anchored, which is the floor.
 */
const LANDMARK_CLASSES = [
  "eyebrow",
  "section-eyebrow",
  "kicker",
  "phase-title",
  "col-title",
  "wg-label"
];

/** Longer than this is a paragraph that shares a class name with a label, not a heading. */
const MAX_LABEL = 120;

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", times: "×", middot: "·", bull: "•", deg: "°"
};

function decode(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Visible text of a fragment of HTML, collapsed to one line. */
function textOf(html: string) {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * An id from a heading's own words. Latin letters, digits and hyphens only —
 * a Hebrew or accented heading still produces something, and when nothing
 * survives the caller falls back to a positional id rather than an empty one.
 */
export function slugifyAnchor(label: string) {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Character ranges whose contents are markup-shaped but are not markup. */
function inertRanges(html: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) out.push([m.index, m.index + m[0].length]);
  return out;
}

/**
 * Give a document anchors, and report what they are.
 *
 * Returns the HTML with ids added and the index the model is shown. Both come
 * out of the same pass on purpose: an index naming an id the document does not
 * contain would produce a "Read more here" link that goes nowhere, which is
 * worse than no link at all.
 */
export function anchorize(html: string): { html: string; anchors: Anchor[] } {
  const inert = inertRanges(html);
  const isInert = (i: number) => inert.some(([a, b]) => i >= a && i < b);

  const anchors: Anchor[] = [];
  const taken = new Set<string>();
  const open = new RegExp(`<(${CANDIDATE_TAGS})\\b([^>]*)>`, "gi");

  let out = "";
  let cursor = 0;

  for (let m = open.exec(html); m; m = open.exec(html)) {
    const [tag, name, attrs] = [m[0], m[1].toLowerCase(), m[2]];
    if (isInert(m.index)) continue;

    // An id already here is somebody's decision. Leave it, and leave it out of
    // the index — citing it would mean this file quietly owning a name it did
    // not choose.
    if (/\sid\s*=/i.test(attrs)) continue;

    const heading = /^h[1-6]$/.test(name);
    if (!heading) {
      const cls = attrs.match(/\sclass\s*=\s*"([^"]*)"/i)?.[1] ?? "";
      const names = cls.split(/\s+/);
      if (!LANDMARK_CLASSES.some((c) => names.includes(c))) continue;
    }

    // The element's own text, up to its closing tag. A div that swallows half
    // the document because of a nested one is caught by the length test below
    // rather than by trying to parse HTML with a regular expression.
    const bodyStart = m.index + tag.length;
    const close = html.slice(bodyStart).search(new RegExp(`</${name}\\s*>`, "i"));
    if (close < 0) continue;
    const label = textOf(html.slice(bodyStart, bodyStart + close));
    if (!label || label.length > MAX_LABEL) continue;

    let id = ANCHOR_PREFIX + (slugifyAnchor(label) || `s${anchors.length + 1}`);
    for (let n = 2; taken.has(id); n++) id = `${ANCHOR_PREFIX}${slugifyAnchor(label) || "s"}-${n}`;
    taken.add(id);
    anchors.push({ id, label });

    out += html.slice(cursor, m.index) + `<${m[1]} id="${id}"${attrs}>`;
    cursor = m.index + tag.length;
  }

  return { html: out + html.slice(cursor), anchors };
}

// ---------------------------------------------------------------------------
// The citation protocol
//
// The Ask widget asks the model to close every answer with a line naming the
// section it drew on, and both ends of that agreement live here: the route
// writes the rule into the prompt, the panel turns the line into a link, and
// the bookkeeping strips it before anything is recorded or emailed. One place,
// so a change to the marker cannot leave half the system reading for the old
// one.

// Read loosely on purpose. The prompt asks for `SOURCE: <id>` exactly, but the
// cost of a model that writes `Source: [cpa-pricing].` instead is a citation
// silently not appearing, and the reader has no way to know they were owed one.
// Nothing is trusted on the strength of this: whatever comes out is checked
// against the document's real anchors before it becomes a link.
const CITED = /\n[ \t]*SOURCE[ \t]*:[ \t]*[[(`'"*]*([A-Za-z0-9_-]+)[\])`'"*.]*[ \t]*$/i;

/**
 * Mid-stream, the marker arrives a few characters at a time. Without this the
 * tail of every answer visibly types out "SOU… SOURCE: cpa-what-…" before
 * vanishing, which reads as a bug in the widget every single time.
 *
 * Upper case only, unlike the one above: a lowercase "so" opens plenty of real
 * sentences, and blinking one out of the answer while the reader watches is a
 * worse bug than the one this fixes.
 */
const PARTIAL = /\n[ \t]*(?:S|SO|SOU|SOUR|SOURC|SOURCE|SOURCE[ \t]*:[ \t]*[[(`'"*]*[A-Za-z0-9_-]*)[ \t]*$/;

/** The answer as prose, and the section id it cited (null for `none`, or not yet arrived). */
export function splitAnswer(raw: string): { text: string; cited: string | null } {
  const done = raw.match(CITED);
  if (done) {
    return {
      text: raw.slice(0, done.index).trimEnd(),
      cited: done[1] === "none" ? null : done[1]
    };
  }
  const partial = raw.match(PARTIAL);
  if (partial) return { text: raw.slice(0, partial.index).trimEnd(), cited: null };
  return { text: raw, cited: null };
}
