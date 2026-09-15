// Compile lib/client-doc and components/client-doc so plain node can import them.
//
// The design system is TypeScript and JSX and imports through the "@/" alias,
// none of which node runs directly and none of which is worth a bundler for two
// scripts. tsc emits to a scratch directory and the alias is rewritten to a
// relative path on the way out.
//
// Shared by scripts/build-preview.mjs and scripts/check-doc-safety.mjs, so the
// preview and the safety check always run against the same compile.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { join, relative, dirname } from "node:path";

export const OUT = join(process.cwd(), "node_modules/.cache/avdoc-preview");

/** Compile the design system to plain ESM under OUT, and return that path. */
export function compileDocLib() {

  // Inside the project, not /tmp: the compiled script imports react, and node
  // only finds it by walking up from the file to a node_modules. Under
  // node_modules/.cache it resolves normally and is already ignored by git.
  
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const tsconfig = join(OUT, "tsconfig.json");

  writeFileSync(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        esModuleInterop: true,
        skipLibCheck: true,
        types: ["node", "react"],
        typeRoots: [join(process.cwd(), "node_modules/@types")],
        outDir: OUT,
        rootDir: process.cwd(),
        baseUrl: process.cwd(),
        paths: { "@/*": ["./*"] }
      },
      // Absolute: `include` resolves relative to the tsconfig, which lives in the
      // scratch directory rather than next to the sources.
      include: [
        join(process.cwd(), "lib/client-doc/**/*"),
        join(process.cwd(), "components/client-doc/**/*"),
        join(process.cwd(), "scripts/preview-client-doc.tsx")
      ]
    })
  );

  try {
    execFileSync("npx", ["tsc", "-p", tsconfig], { cwd: process.cwd(), stdio: "inherit" });
  } catch {
    process.exit(1);
  }

  // Rewrite the "@/" alias and add the extensions node's ESM loader requires.
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".js") ? [join(dir, e.name)] : []
    );

  for (const file of walk(OUT)) {
    const src = readFileSync(file, "utf8").replace(
      /from "(@\/|\.\.?\/)([^"]*)"/g,
      (_m, head, rest) => {
        const abs = head === "@/" ? join(OUT, rest) : join(dirname(file), head, rest);
        const target =
          head === "@/" ? relative(dirname(file), abs) || "." : `${head}${rest}`;
        const rel = target.startsWith(".") ? target : `./${target}`;
        if (/\.[mc]?js$/.test(rel)) return `from "${rel}"`;
        // A bare directory import is an index file; node's ESM loader, unlike
        // the bundler resolution tsc compiled against, will not infer either.
        const isDir = existsSync(abs) && statSync(abs).isDirectory();
        return `from "${rel}${isDir ? "/index.js" : ".js"}"`;
      }
    );
    writeFileSync(file, src);
  }


  return OUT;
}
