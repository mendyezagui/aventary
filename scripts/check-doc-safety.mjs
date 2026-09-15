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
