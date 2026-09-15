// Render the client-document template to preview/ — see scripts/preview-client-doc.tsx.
//
//   npm run preview:doc
//   AVDOC_FIXTURE=~/scratch/acme.json AVDOC_OUT=~/scratch/acme.html npm run preview:doc
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { compileDocLib } from "./compile-doc-lib.mjs";

const out = compileDocLib();
execFileSync("node", [join(out, "scripts/preview-client-doc.js")], { stdio: "inherit" });
