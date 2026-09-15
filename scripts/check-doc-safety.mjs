// What a client document must never render, whoever wrote the row.
//
//   npm run check:doc
//
// Block bodies reach the renderer from Client Hub and from the `blocks` column
// a generated document is written into. Neither is a client typing, which is
// why this is hardening rather than an incident — and not a reason to skip it:
// a document is assembled from database rows and shown to someone outside the
// company, in a page served from the origin that holds their session cookie.
//
// Escaping raw HTML alone does not cover this. `[click](javascript:alert(1))`
// is ordinary markdown, and marked emits the href untouched by default.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { compileDocLib } from "./compile-doc-lib.mjs";

const out = compileDocLib();
const { md } = await import(join(out, "lib/client-doc/markdown.js"));
const { parseBlock } = await import(join(out, "lib/client-doc/parse.js"));
const { normalizeBlocks, buildDocument } = await import(join(out, "lib/client-doc/document.js"));

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) {
    failures++;
    console.error(`FAIL  ${label}\n      ${detail}`);
  } else {
    console.log(`ok    ${label}`);
  }
};

const DANGEROUS = /(?:href|src)\s*=\s*"\s*(?:javascript|data|vbscript)/i;

// --- link and image targets -------------------------------------------------
for (const src of [
  "[x](javascript:alert(1))",
  "[x](JaVaScRiPt:alert(1))",
  "[**b** x](javascript:alert(1))",
  "![x](javascript:alert(1))",
  "[x](data:text/html,<script>alert(1)</script>)",
  "[x](vbscript:msgbox(1))"
]) {
  const html = md(src);
  check(`refuses ${src}`, !DANGEROUS.test(html), html);
}

// A refused link keeps its words: dropping them would delete a sentence from a
// proposal to make a security point.
check("refused link keeps its text", md("[click me](javascript:alert(1))").includes("click me"),
  md("[click me](javascript:alert(1))"));

// --- targets that must keep working ----------------------------------------
for (const [src, want] of [
  ["[x](https://example.com)", 'href="https://example.com"'],
  ["[x](mailto:a@b.com)", 'href="mailto:a@b.com"'],
  ["[x](#anchor)", 'href="#anchor"'],
  ["[x](/work)", 'href="/work"'],
  ["![x](https://example.com/a.png)", 'src="https://example.com/a.png"']
]) {
  check(`keeps ${src}`, md(src).includes(want), md(src));
}

// --- raw HTML in a body -----------------------------------------------------
check("raw <script> renders as text",
  !/<script/i.test(md('<script>alert(1)</script>')), md('<script>alert(1)</script>'));
check("format:html renders as text",
  !/<script/i.test(parseBlock({ tab: "t", title: null, body: "<script>alert(1)</script>", format: "html", sort: 0 }, 0).html),
  parseBlock({ tab: "t", title: null, body: "<script>alert(1)</script>", format: "html", sort: 0 }).html);

// --- inline SVG: the one place markup is allowed through -------------------
const { sanitizeSvg, svgAccessibleName } = await import(join(out, "lib/client-doc/svg.js"));
const SVG_BAD = /<script|<foreignobject|<iframe|\son[a-z]+\s*=|javascript:|data:text\/html|@import|url\(\s*['"]?https?:/i;

for (const [label, src] of [
  ["script element", '<svg><script>alert(1)</script><rect/></svg>'],
  ["foreignObject", '<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>'],
  ["onload on root", '<svg onload="alert(1)"><rect/></svg>'],
  ["onclick on a shape", '<svg><rect onclick="alert(1)" width="10"/></svg>'],
  ["javascript: href", '<svg><use href="javascript:alert(1)"/></svg>'],
  ["external use href", '<svg><use href="https://evil.example/x.svg#a"/></svg>'],
  ["@import in style", '<svg><style>@import url("https://evil.example/x.css");</style><rect/></svg>'],
  ["remote url() in style", '<svg><style>.a{fill:url(https://evil.example/t.png)}</style><rect/></svg>'],
  ["remote url() in fill", '<svg><rect fill="url(https://evil.example/t.png)"/></svg>'],
  ["animate to href", '<svg><animate attributeName="href" to="javascript:alert(1)"/><rect/></svg>'],
  ["nested html", '<svg><g><iframe src="javascript:alert(1)"></iframe></g></svg>']
]) {
  const cleaned = sanitizeSvg(src) ?? "";
  check(`svg refuses ${label}`, !SVG_BAD.test(cleaned), cleaned);
}

// Legitimate diagram content must survive, or the component is useless.
const diagram = sanitizeSvg(
  '<svg viewBox="0 0 100 40" role="img" aria-label="x">' +
  '<defs><marker id="a" refX="4"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>' +
  '<style>.node{fill:#eee}</style>' +
  '<rect class="node" x="1" y="2" width="30" height="10" rx="3"/>' +
  '<line x1="0" y1="0" x2="9" y2="9" marker-end="url(#a)"/>' +
  '<text x="5" y="20" text-anchor="middle">Label &amp; more</text></svg>'
) ?? "";
for (const want of ['viewBox="0 0 100 40"', 'aria-label="x"', "<marker", "<style", "fill:#eee",
                    'class="node"', 'rx="3"', 'marker-end="url(#a)"', "Label &amp; more"]) {
  check(`svg keeps ${want}`, diagram.includes(want), diagram.slice(0, 160));
}
check("svg refuses a non-svg body", sanitizeSvg("just some text") === null, "expected null");

// --- who names the diagram --------------------------------------------------
// role="img" on the wrapper replaces everything inside it for a screen reader,
// so the wrapper is labelled only when the diagram is not.
const named = (body) =>
  parseBlock({ tab: "t", title: "The map", body: `@component: svg\n\n${body}`, format: "markdown", sort: 0 });

check("svg names itself by aria-label",
  svgAccessibleName('<svg aria-label="Site map: home branches into About"><rect/></svg>') ===
    "Site map: home branches into About", "no name read");
check("svg names itself by a root <title>",
  svgAccessibleName("<svg><title>Migration sequence</title><rect/></svg>") === "Migration sequence", "no name read");
check("a <title> inside a shape does not name the diagram",
  svgAccessibleName("<svg><g><title>one node</title><rect/></g></svg>") === null, "named by a child's title");
check("an unnamed svg has no name",
  svgAccessibleName('<svg viewBox="0 0 10 10"><rect/></svg>') === null, "named from nothing");
check("a name is unescaped, not raw entities",
  svgAccessibleName('<svg aria-label="Events &amp; trips"><rect/></svg>') === "Events & trips", "left escaped");

check("a self-naming diagram leaves the wrapper unnamed",
  named('<svg aria-label="Site map: seven sections"><rect/></svg>').label === null, "wrapper was labelled anyway");
check("an unnamed diagram falls back to the block title",
  named("<svg><rect/></svg>").label === "The map", "no fallback label");
check("@label wins over both",
  parseBlock({ tab: "t", title: "The map",
    body: '@component: svg\n@label: Proposed structure\n\n<svg aria-label="x"><rect/></svg>',
    format: "markdown", sort: 0 }).label === "Proposed structure", "directive ignored");

// --- brand values reach a style attribute, so they are hex or nothing -------
const hostile = buildDocument({
  name: "n", client: null,
  meta: { brand: { accent: "red; } body{display:none}", logo: "javascript:alert(1)" } },
  blocks: normalizeBlocks([{ tab: "t", title: null, body: "x", sort: 0 }])
});
check("refuses a non-hex accent", /^#[0-9a-f]{6}$/i.test(hostile.brand.accent), hostile.brand.accent);
check("refuses a javascript: logo", hostile.brand.logo === null, String(hostile.brand.logo));

// --- malformed rows are dropped, never thrown on ---------------------------
const messy = normalizeBlocks([
  { tab: "a", body: "kept", sort: 0 }, { tab: "a", body: "   " }, { tab: "a" },
  "string", null, 42, { tab: "a", body: "also kept", sort: "x" }
]);
check("drops unusable blocks, keeps the rest", messy.length === 2, JSON.stringify(messy));

console.log(failures ? `\n${failures} failure(s)` : "\nall clear");
process.exit(failures ? 1 : 0);
