#!/usr/bin/env node
// Prints the SQL that sets (or clears) a client page's shared password.
//
//   node scripts/set-client-password.mjs <slug> '<password>'
//   node scripts/set-client-password.mjs <slug> --none
//
// The password is hashed here and never leaves this machine — only the hash
// goes into the database, and nothing ever goes into the repository.

import { webcrypto as crypto } from "node:crypto";

const [slug, password] = process.argv.slice(2);
if (!slug || !password) {
  console.error("usage: node scripts/set-client-password.mjs <slug> '<password>' | --none");
  process.exit(2);
}

if (password === "--none") {
  console.log(`\nupdate client_pages set password_hash = null where slug = '${slug}';\n`);
  console.log("  Page becomes sign-in-link only.\n");
  process.exit(0);
}

// Must match PBKDF2_ITERATIONS in lib/client-pages.ts. Cloudflare Workers
// refuses anything above 100,000, so a hash written higher cannot be verified
// in production even though Node will happily generate it.
const ITERATIONS = 100_000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
);
const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, key, 256
);
const b64 = (b) => Buffer.from(b).toString("base64");
const hash = `pbkdf2-sha256$${ITERATIONS}$${b64(salt)}$${b64(new Uint8Array(bits))}`;

console.log(`\nupdate client_pages set password_hash = '${hash}' where slug = '${slug}';\n`);
console.log("  Run that in the Supabase SQL editor. The password itself is not stored.\n");
