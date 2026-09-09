#!/usr/bin/env node
/**
 * PreToolUse guard for Bash commands.
 *
 * Blocks the two things a contributor's Claude session must never do on its
 * own: put commits on `main`, and ship to production.
 *
 * This is a seatbelt, not a lock. Anyone can edit or delete this file, run the
 * command in their own terminal, or start Claude with permissions skipped. The
 * control that actually holds is the branch protection rule on `main` (see
 * scripts/setup-branch-protection.sh) plus not handing out the Cloudflare and
 * Supabase production credentials. This hook exists so honest mistakes stop
 * here instead of in production.
 *
 * Wired up by .claude/settings.json. Exit 2 = block, stderr goes back to Claude.
 */

import { execSync } from "node:child_process";

const PROTECTED = /^(main|master|production|prod)$/;

const payload = await new Promise((resolve) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (buf += c));
  process.stdin.on("end", () => resolve(buf));
  process.stdin.on("error", () => resolve(""));
});

let command = "";
try {
  command = JSON.parse(payload || "{}")?.tool_input?.command ?? "";
} catch {
  command = "";
}
if (!command.trim()) process.exit(0);

function block(reason, instead) {
  process.stderr.write(
    `BLOCKED by .claude/hooks/guard-prod.mjs\n\n${reason}\n\n${instead}\n\n` +
      `If you genuinely need this, stop and ask Mendy — do not work around the hook.\n`
  );
  process.exit(2);
}

function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const PR_FLOW =
  "Open a pull request instead:\n" +
  "  git switch -c feat/short-description\n" +
  "  git push -u origin feat/short-description\n" +
  "  gh pr create --fill        # or open the PR on github.com\n" +
  "Mendy reviews it; merging the PR is what ships to production.";

/**
 * A heredoc body is data being written to a file, not commands to run. This
 * repository documents the blocked commands, and those docs get written with
 * `cat > file <<'EOF'` — without this the guard would block its own README.
 */
function stripHeredocs(input) {
  let out = input;
  const opener = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/;
  for (let guard = 0; guard < 20; guard += 1) {
    const m = opener.exec(out);
    if (!m) break;
    const delimiter = m[2];
    const bodyStart = m.index + m[0].length;
    const end = new RegExp(`^${delimiter}$`, "m").exec(out.slice(bodyStart));
    // Unterminated heredoc: everything after the opener is body.
    const bodyEnd = end ? bodyStart + end.index + end[0].length : out.length;
    out = `${out.slice(0, m.index)} HEREDOC ${out.slice(bodyEnd)}`;
  }
  return out;
}

// Split on shell separators so `cd x && git push origin main` is still caught.
// Deliberately not splitting on a single `|`: after heredocs are stripped, a
// pipe is far more likely to be a markdown table inside a quoted string than a
// way to smuggle a deploy past this.
const segments = stripHeredocs(command)
  .split(/(?:&&|\|\||;|\n)/)
  .map((s) => s.replace(/\s+/g, " ").trim())
  .filter(Boolean);

// Segments that only move text around (writing these very docs, grepping for
// the rule) are not attempts to run it. Anything that could execute is checked.
const TEXT_ONLY = /^(echo|printf|cat|tee|grep|rg|sed|awk|head|tail|less|#)\b/;

for (const seg of segments) {
  if (TEXT_ONLY.test(seg)) continue;

  // ---- 1. Deploying straight to production -------------------------------
  const DEPLOY = [
    [/\bwrangler\b.*\bdeploy\b/, "a Cloudflare Wrangler deploy"],
    [/\bopennextjs-cloudflare\b.*\bdeploy\b/, "an OpenNext Cloudflare deploy"],
    [/\bnpm run (deploy|cf:deploy)\b/, "the repo's deploy script"],
    [/\b(npx |pnpm |yarn )?vercel\b.*(--prod|\bdeploy\b)/, "a Vercel production deploy"],
    [/\bops\/deploy_who\.sh\b/, "the VPS deploy script in ops/"],
    [/\bsupabase\b.*\bdb (push|reset)\b/, "a schema change against the linked Supabase project"],
    [/\bssh\b.*@\d{1,3}(\.\d{1,3}){3}/, "an SSH session to a production server"],
  ];
  for (const [re, what] of DEPLOY) {
    if (re.test(seg)) {
      block(
        `That command is ${what}. Production is not shipped by hand from a\n` +
          "contributor session — it ships from `main` after a reviewed merge.",
        PR_FLOW
      );
    }
  }

  // ---- 2. Pushing to a protected branch ----------------------------------
  if (/\bgit\b.*\bpush\b/.test(seg)) {
    if (/\s(-f|--force)(\s|$)/.test(seg)) {
      block(
        "Force-pushing rewrites history that other people (and open PRs) are\n" +
          "already building on.",
        "Use `git push --force-with-lease` on your own feature branch only, and\n" +
          "never on main. To undo a bad commit, add a new commit that reverts it."
      );
    }
    if (/\s--delete(\s|$)/.test(seg) || /\sorigin\s+:/.test(seg)) {
      block(
        "That deletes a remote branch.",
        "Delete branches from the PR page on github.com after the PR is merged."
      );
    }

    // Explicit destination ref: `... origin main`, `... origin HEAD:main`,
    // `... origin feat/x:main`, `... origin +main`.
    const refs = seg.split(/\s+/).slice(1);
    for (const raw of refs) {
      if (raw.startsWith("-")) continue;
      const ref = raw.replace(/^\+/, "").replace(/^refs\/heads\//, "");
      const dest = ref.includes(":") ? ref.split(":").pop() : ref;
      if (dest && PROTECTED.test(dest.replace(/^refs\/heads\//, ""))) {
        block(
          `That pushes directly to \`${dest}\`, which is the production branch.`,
          PR_FLOW
        );
      }
    }

    // Bare `git push` / `git push origin` while sitting on a protected branch.
    const branch = currentBranch();
    if (PROTECTED.test(branch) && !refs.some((r) => !r.startsWith("-") && r.includes(":"))) {
      block(
        `You are on \`${branch}\` — a bare \`git push\` here goes straight to production.`,
        PR_FLOW
      );
    }
  }

  // ---- 3. Committing on a protected branch -------------------------------
  if (/\bgit\b.*\bcommit\b/.test(seg)) {
    const branch = currentBranch();
    if (PROTECTED.test(branch)) {
      block(
        `You are committing on \`${branch}\`. Work never starts on the production branch.`,
        "Move to a branch first (this keeps the changes you already made):\n" +
          "  git switch -c feat/short-description\n" +
          "then commit and push there."
      );
    }
  }
}

process.exit(0);
