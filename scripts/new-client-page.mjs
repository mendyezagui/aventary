#!/usr/bin/env node
// Scaffolds a client page at /c/<slug>.
//
//   node scripts/new-client-page.mjs <slug> "Page title" path/to/document.html
//
// Writes content/clients/<slug>.ts, wires it into the registry, and prints the
// one SQL statement that opens it to readers. Nothing here touches Cloudflare.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [slug, title, source] = process.argv.slice(2);
if (!slug || !title || !source) {
  console.error("usage: node scripts/new-client-page.mjs <slug> \"Title\" <document.html>");
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`slug must be lowercase letters, digits and dashes — got "${slug}"`);
  process.exit(2);
}

const contentDir = join("content", "clients");
const target = join(contentDir, `${slug}.ts`);
if (existsSync(target)) {
  console.error(`${target} already exists. Edit it, or pick another slug.`);
  process.exit(1);
}

// Accept either a full standalone document or a bare fragment. A document
// authored with its own <style> block keeps everything before </style>; that
// belongs in the page's stylesheet, not in the body.
const raw = readFileSync(source, "utf8");
const body = (raw.includes("</style>") ? raw.split("</style>").pop() : raw).trim();
if (body.includes("`") || body.includes("${")) {
  console.error("document contains a backtick or ${ — these break the generated module.");
  process.exit(1);
}

writeFileSync(
  target,
  `// ${title}\n// Hand-authored HTML, embedded verbatim. See docs/client-pages.md.\n` +
    `export const html = ${JSON.stringify(body)};\n`
);

const indexPath = join(contentDir, "index.ts");
let index = readFileSync(indexPath, "utf8");
if (!index.includes(`from "./${slug}"`)) {
  index = index.replace(
    /^(import .+\n)(?![\s\S]*^import )/m,
    `$1import { html as ${slug.replace(/-/g, "_")} } from "./${slug}";\n`
  );
  index = index.replace(
    /(export const CLIENT_PAGES[^{]*\{\n)/,
    `$1  "${slug}": {\n    title: ${JSON.stringify(title)},\n    blurb: "A document prepared by Aventary.",\n    html: ${slug.replace(/-/g, "_")}\n  },\n`
  );
  writeFileSync(indexPath, index);
}

const sql =
  `insert into client_pages (slug, title, allowed_emails) values\n` +
  `  ('${slug}', ${JSON.stringify(title).replace(/"/g, "'")}, array['someone@example.com']);`;

console.log(`\n  wrote    ${target}`);
console.log(`  wired    ${indexPath}`);
console.log(`\n  Edit the blurb in ${indexPath}, then run this against Supabase:\n`);
console.log(sql.split("\n").map((l) => "    " + l).join("\n"));
console.log(`\n  Then commit and push. The page goes live at /c/${slug}.\n`);
