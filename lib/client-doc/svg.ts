// Letting a document carry a diagram, without letting it carry a script.
//
// WHY THIS EXISTS. Everything else in a block body is markdown, and raw HTML
// renders as visible text — deliberately, because these bodies arrive from a
// database and are shown to someone outside the company. That rule cost us
// something real: the two hand-built documents this template replaced each
// carried a diagram that was doing actual work. MYEF's site map was 60-odd
// nodes; the Cheder Menachem proposal's was a 6.5KB sequence showing each
// module leaving the old system one at a time. Converting those documents to
// blocks meant flattening the diagrams into lists, which is a downgrade, not a
// migration.
//
// So this is one narrow, audited opening in that rule: inline SVG, rebuilt from
// an allowlist rather than filtered for bad patterns.
//
// REBUILT, NOT FILTERED. A blocklist over untrusted markup is a losing game —
// every parser quirk is a bypass. This walks the input, drops any element not
// on the allowlist, and re-emits each surviving element with only the
// attributes on the allowlist, values re-quoted. Anything unrecognised does not
// survive by default, because it is never copied through.
//
// Inline rather than a hosted image, on purpose: an inline diagram inherits the
// document's accent and ink, so it themes per client, stays sharp at any zoom,
// and can still be edited in Client Hub. A PNG would freeze all three.

/** Elements a diagram legitimately needs. Everything else is dropped. */
const ELEMENTS = new Set([
  "svg", "g", "defs", "symbol", "use", "title", "desc",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "textPath",
  "marker", "linearGradient", "radialGradient", "stop",
  "clipPath", "mask", "pattern", "style"
]);

/**
 * Elements whose CONTENT is dropped along with the tag.
 *
 * script is the obvious one. foreignObject is the one that gets forgotten: it
 * is an SVG element whose children are ordinary HTML, so allowing it would
 * reopen the whole hole this file exists to keep shut.
 */
const DROP_WHOLE = new Set(["script", "foreignobject", "iframe", "image", "audio", "video", "animate", "animatetransform", "animatemotion", "set", "handler"]);

/** Attributes a diagram legitimately needs. Everything else is dropped. */
const ATTRIBUTES = new Set([
  "viewbox", "xmlns", "width", "height", "preserveaspectratio",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
  "d", "points", "transform", "class", "id",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit",
  "opacity", "fill-opacity", "stroke-opacity", "fill-rule", "clip-rule",
  "text-anchor", "dominant-baseline", "alignment-baseline", "baseline-shift",
  "font-size", "font-family", "font-weight", "font-style", "letter-spacing",
  "offset", "stop-color", "stop-opacity",
  "gradientunits", "gradienttransform", "spreadmethod",
  "markerwidth", "markerheight", "refx", "refy", "orient", "markerunits",
  "patternunits", "patterntransform", "clippathunits", "maskunits",
  "clip-path", "mask", "marker-start", "marker-mid", "marker-end",
  "vector-effect", "paint-order", "role", "aria-label", "aria-hidden",
  "xml:space", "shape-rendering", "overflow"
]);

// Bare ampersands only: an entity already in the source is left alone, or the
// text of every label comes out double-escaped.
const esc = (s: string) =>
  s.replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escAttr = (s: string) =>
  esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * A reference that stays inside this document.
 *
 * `use`, `clip-path`, `marker-end` and friends point at an id in the same SVG.
 * Anything that is not a bare `#fragment` is refused — an external reference is
 * both a way to pull in markup this file never inspected and a way to tell a
 * third party that a confidential page was opened.
 */
const localRef = (v: string) => (/^#[A-Za-z][\w:.-]*$/.test(v.trim()) ? v.trim() : null);

/** url(#id) or a plain colour word. Refuses url() pointing anywhere else. */
function paintValue(v: string): string | null {
  const t = v.trim();
  const url = t.match(/^url\((['"]?)([^'")]*)\1\)$/i);
  if (url) return localRef(url[2]) ? `url(${url[2]})` : null;
  // No url() anywhere else in the value, and no scheme-looking text.
  return /url\s*\(|javascript:|data:|expression\s*\(/i.test(t) ? null : t;
}

/**
 * CSS inside an <svg><style> block.
 *
 * The diagrams this exists for style themselves by class, so dropping <style>
 * would keep the shapes and lose the design. Kept, with the two things CSS can
 * do that are not drawing removed: @import, and url() pointing off-document.
 */
function sanitizeCss(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/url\s*\(\s*(['"]?)([^'")]*)\1\s*\)/gi, (m, _q, ref) =>
      localRef(ref) ? `url(${ref})` : "none")
    .replace(/<\/?[a-z]/gi, "");
}

const ATTR = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function attributes(raw: string, tag: string): string {
  let out = "";
  for (let m = ATTR.exec(raw); m; m = ATTR.exec(raw)) {
    // Looked up folded, emitted as written. SVG attribute names are
    // case-sensitive: viewBox, refX, gradientUnits, preserveAspectRatio and
    // friends are silently ignored by the browser if their case is changed,
    // which costs the diagram its coordinate system.
    const as = m[1];
    const name = as.toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";

    // Every event handler, in one rule, before any allowlist lookup.
    if (name.startsWith("on")) continue;
    // href is allowed only on <use>, and only into this same document.
    if (name === "href" || name === "xlink:href") {
      const ref = tag === "use" ? localRef(value) : null;
      if (ref) out += ` href="${escAttr(ref)}"`;
      continue;
    }
    if (name === "style") {
      const css = sanitizeCss(value);
      if (css.trim()) out += ` style="${escAttr(css)}"`;
      continue;
    }
    if (!ATTRIBUTES.has(name)) continue;

    // Attributes that can carry url(): keep only document-local references.
    if (/^(fill|stroke|clip-path|mask|marker-(start|mid|end)|filter)$/.test(name)) {
      const safe = paintValue(value);
      if (safe === null) continue;
      out += ` ${as}="${escAttr(safe)}"`;
      continue;
    }
    out += ` ${as}="${escAttr(value)}"`;
  }
  ATTR.lastIndex = 0;
  return out;
}

const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

/**
 * An SVG rebuilt from the parts of it that are allowed to exist.
 *
 * Returns null when the input does not contain an `<svg>` root at all, which is
 * how the caller tells a mistyped block from a diagram and falls back to prose
 * rather than rendering an empty box.
 */
export function sanitizeSvg(source: string): string | null {
  const open = source.search(/<svg[\s>]/i);
  const close = source.toLowerCase().lastIndexOf("</svg>");
  if (open < 0 || close < open) return null;

  // Only the diagram itself. A block body is the SVG plus, usually, a caption
  // after it — without this the caption is escaped and appended inside the
  // figure as stray text, and then rendered a second time as the caption.
  const input = source.slice(open, close + "</svg>".length);

  let out = "";
  let cursor = 0;
  let dropDepth = 0;
  let dropTag = "";
  let inStyle = false;
  let styleText = "";
  let depth = 0;

  for (let m = TAG.exec(input); m; m = TAG.exec(input)) {
    const [whole, closing, rawName, attrs, selfClose] = m;
    const name = rawName.toLowerCase();
    const text = input.slice(cursor, m.index);
    cursor = m.index + whole.length;

    if (dropDepth > 0) {
      if (name === dropTag) dropDepth += closing ? -1 : selfClose ? 0 : 1;
      continue;
    }
    if (inStyle) {
      if (closing && name === "style") {
        out += sanitizeCss(styleText + text) + "</style>";
        inStyle = false;
        styleText = "";
      } else {
        styleText += text + whole;
      }
      continue;
    }

    out += esc(text);

    if (DROP_WHOLE.has(name)) {
      if (!closing && !selfClose) {
        dropDepth = 1;
        dropTag = name;
      }
      continue;
    }
    if (!ELEMENTS.has(rawName) && !ELEMENTS.has(name)) continue;

    if (closing) {
      if (depth > 0) depth--;
      out += `</${rawName}>`;
      continue;
    }
    if (name === "style") {
      out += "<style>";
      inStyle = true;
      continue;
    }
    out += `<${rawName}${attributes(attrs, name)}${selfClose ? "/" : ""}>`;
    if (!selfClose) depth++;
  }

  out += esc(input.slice(cursor));
  return /<svg[\s>]/i.test(out) ? out : null;
}
