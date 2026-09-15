// SoFa Developer Associate — the build half of the pair.
//
// The two associates split by question, not by subject:
//   · sofa-jcc  (Business)  — "what does the community need this week?"
//   · sofa-dev  (Developer) — "what has to be built, and is it built yet?"
//
// They talk through ONE object: a work order. The business associate raises
// one whenever it needs something that isn't a flyer it can draw itself; the
// developer associate specs it, builds what it can build in-app, and hands off
// what it cannot with a prompt precise enough to run unattended.
//
// The handoff is deliberate. This module does not hold a GitHub token and does
// not push to sofajcc.org on its own — see docs/sofa-jcc/DEVELOPER.md for what
// full autonomy would require.

import { BRAND } from "./brand.js";

/**
 * What kinds of work exist, and — the important column — whether the
 * associate can finish it inside Second Brain or must hand it to a repo.
 */
export const WORK_KINDS = {
  flyer_publish: {
    label: "Publish a flyer",
    buildable: true,
    blurb: "Render an approved flyer to PNG/HTML and stage it for the site or a group chat.",
    repo: "mendyezagui/aventary", path: "sofajcc/",
  },
  page: {
    label: "New / edited page",
    buildable: false,
    blurb: "A page on sofajcc.org — add, restructure, or rewrite.",
    repo: "mendyezagui/aventary", path: "sofajcc/",
  },
  asset: {
    label: "Image or asset",
    buildable: true,
    blurb: "Resize, crop, re-export, or generate a branded image.",
    repo: "mendyezagui/aventary", path: "sofajcc/assets/",
  },
  content: {
    label: "Copy change",
    buildable: true,
    blurb: "Rewrite text on an existing page. Draft in-app, apply in the repo.",
    repo: "mendyezagui/aventary", path: "sofajcc/",
  },
  label_sheet: {
    label: "Sefarim labels",
    buildable: true,
    blurb: "Generate a dedication label sheet from the shul's Word template.",
    repo: null, path: null,
  },
  fix: {
    label: "Bug / fix",
    buildable: false,
    blurb: "Something on the site is broken or wrong.",
    repo: "mendyezagui/aventary", path: "sofajcc/",
  },
  other: { label: "Other", buildable: false, blurb: "Anything else.", repo: null, path: null },
};

export const STATUSES = ["queued", "speccing", "ready", "in_progress", "done", "blocked"];

/** A work order the business associate raises for the developer associate. */
export function blankWorkOrder(overrides = {}) {
  return {
    title: "",
    kind: "other",
    request: "",
    spec: "",
    acceptance: [],
    target_repo: null,
    target_path: null,
    status: "queued",
    priority: "normal",
    requested_by: "agent:sofa-jcc",
    event_id: null,
    flyer_id: null,
    artifact_html: "",
    artifact_path: "",
    handoff_prompt: "",
    result: "",
    ...overrides,
  };
}

/**
 * The business associate's own trigger: given today's plan, what does it need
 * the developer to build? Kept narrow on purpose — a queue that fills itself
 * with speculative work is a queue nobody reads.
 */
/**
 * Which finished flyers are work the developer associate should pick up.
 *
 * This reads the STORED flyers, not the plan's freshly-emitted drafts, and
 * that distinction is the whole fix. The original version walked
 * `plan.drafts`, so an order could only ever be raised on the same run that
 * drafted a ready flyer. In practice a flyer is drafted with gaps, a human
 * fills them in days later, and by then the scan emits no draft for it at
 * all — so the order was never raised and `sofa_work_orders` stayed empty
 * for the entire life of the pair.
 *
 * Reading stored state covers both cases with one code path: step 2 has
 * already written any new draft by the time this runs, so a flyer that
 * became ready this morning and one that became ready last Tuesday are
 * treated identically. dedupe_key keeps a re-scan from raising it twice.
 *
 * A flyer that has everything it needs is work: it should reach people.
 */
export function ordersForFlyers(flyers = [], eventsById = {}, { existingKeys = [] } = {}) {
  const seen = new Set(existingKeys);
  const out = [];
  for (const f of flyers) {
    if (f?.status !== "ready") continue;
    const ev = eventsById[f.event_id] || null;
    // A published flyer is already out; nothing left to hand over.
    if (ev?.status === "published" || ev?.status === "cancelled") continue;

    const key = `publish:${ev?.hebcal_key || `event-${f.event_id}`}:v${f.version || 1}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push(blankWorkOrder({
      dedupe_key: key,
      title: `Publish the ${ev?.title || "SoFa"} flyer`,
      kind: "flyer_publish",
      request: "This flyer has no gaps left. Export it and put it where the community will see it.",
      event_id: f.event_id ?? null,
      flyer_id: f.id ?? null,
      priority: "high",
      ...pathsFor("flyer_publish"),
    }));
  }
  return out;
}

const pathsFor = (kind) => {
  const k = WORK_KINDS[kind] || WORK_KINDS.other;
  return { target_repo: k.repo, target_path: k.path };
};
export { pathsFor };

/**
 * The handoff prompt. This is the developer associate's real output for
 * anything it cannot finish itself: a self-contained brief that a Claude Code
 * session (or a person) can execute against the repo without asking questions.
 *
 * It is written to stand alone — the receiving session has none of this
 * conversation's context.
 */
export function handoffPrompt(order, { context = {} } = {}) {
  const k = WORK_KINDS[order.kind] || WORK_KINDS.other;
  const repo = order.target_repo || k.repo;
  const path = order.target_path || k.path;
  const lines = [
    `# Work order: ${order.title}`,
    "",
    `**Repository:** ${repo || "(none — this is in-app work)"}`,
    path ? `**Area:** \`${path}\`` : null,
    `**Raised by:** the SoFa JCC business associate in Second Brain`,
    "",
    "## What is being asked",
    order.request || "(no request text)",
    "",
    order.spec ? "## Build spec\n" + order.spec + "\n" : null,
    "## Context you need",
    `- The site is the static folder \`sofajcc/\` — plain HTML/CSS, no build step, deployed to Cloudflare Pages.`,
    `- Shul name: **${BRAND.name}** (${BRAND.nameHe}), known publicly as **${BRAND.publicName}**, in ${BRAND.city}.`,
    `- Brand values are locked in \`src/lib/sofa/brand.js\` in the second-brain repo, and mirrored in \`sofajcc/assets/styles.css\`. Do not invent colours or type.`,
    `- Logo files: \`public/sofa-jcc/brand/logo-lockup.png\` (sofa + wordmark), \`logo-mark.png\` (sofa only), \`mark-dancer.png\` (gold disc).`,
    context.extra ? `- ${context.extra}` : null,
    "",
    "## Acceptance",
    ...(order.acceptance?.length
      ? order.acceptance.map((a) => `- [ ] ${a}`)
      : ["- [ ] The change matches the request exactly, with no scope added.",
         "- [ ] Brand colours and the logo come from the locked sources, not from new values.",
         "- [ ] Nothing already published is overwritten without being asked."]),
    "",
    "## Rules",
    "- Do not invent a time, address, phone number or person's name. If a fact is missing, stop and say which one.",
    "- Do not publish, post or email anything to the community. Build it and stop.",
    "- Commit on a branch. Do not push to main.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** One-line status for the console and for the business associate to read. */
export function queueSummary(orders = []) {
  const by = (s) => orders.filter((o) => o.status === s).length;
  const open = orders.filter((o) => !["done", "blocked"].includes(o.status)).length;
  if (!orders.length) return "No work orders.";
  return `${open} open · ${by("queued")} queued, ${by("ready")} ready to run, ${by("in_progress")} in progress, ${by("blocked")} blocked`;
}
