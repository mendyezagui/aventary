#!/usr/bin/env node
/**
 * Tests for guard-prod.mjs. Run with:  node .claude/hooks/guard-prod.test.mjs
 *
 * Run this after editing the guard. A guard that blocks too much is almost as
 * bad as one that blocks too little — people route around a tool that cries
 * wolf, and then it protects nothing.
 *
 * Note: cases are assembled from fragments rather than written out whole, so
 * that this file can be edited from a Claude session without the guard
 * blocking the edit for containing its own trigger strings.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "guard-prod.mjs");
const PUSH = "git push";
const RUN = "npm run";

function run(command) {
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    encoding: "utf8",
  });
  return res.status;
}

const BLOCK = [
  `${PUSH} origin main`,
  `${PUSH} -u origin main`,
  `${PUSH} origin HEAD:main`,
  `${PUSH} origin feat/x:main`,
  `${PUSH} origin refs/heads/main`,
  `${PUSH} origin +main`,
  `cd /repo && ${PUSH} origin main`,
  `${PUSH} --force origin feat/x`,
  `${PUSH} origin --delete feat/x`,
  `${RUN} deploy`,
  `${RUN} cf:deploy`,
  "npx wrangler deploy",
  "vercel --prod",
  "bash ops/deploy_who.sh",
  "supabase db push",
  "ssh -i ~/.ssh/key root@203.0.113.10 'ls'",
  // A heredoc that ends, followed by a real deploy, is still caught.
  `cat > doc.md <<'EOF'\nnotes\nEOF\n${RUN} deploy`,
];

const ALLOW = [
  `${PUSH} -u origin feat/insights-toggle`,
  `${PUSH} --force-with-lease origin feat/x`,
  `${PUSH} origin claude/some-task`,
  "git status",
  "git switch -c feat/x",
  `${RUN} build`,
  `${RUN} lint`,
  "npm ci",
  // Writing documentation that quotes the blocked commands.
  `cat > doc.md <<'EOF'\n| cmd | ${RUN} deploy |\n${PUSH} origin main\nEOF`,
  // Searching for them.
  `grep -rn '${PUSH} origin main' docs/`,
];

let failures = 0;
for (const cmd of BLOCK) {
  const status = run(cmd);
  if (status !== 2) {
    failures += 1;
    console.error(`FAIL (expected block, got ${status}): ${JSON.stringify(cmd)}`);
  }
}
for (const cmd of ALLOW) {
  const status = run(cmd);
  if (status !== 0) {
    failures += 1;
    console.error(`FAIL (expected allow, got ${status}): ${JSON.stringify(cmd)}`);
  }
}

const total = BLOCK.length + ALLOW.length;
if (failures) {
  console.error(`\n${failures}/${total} cases failed.`);
  process.exit(1);
}
console.log(`guard-prod: ${total}/${total} cases passed.`);
