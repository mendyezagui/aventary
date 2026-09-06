// integration.example.mjs — how to wire datadog.mjs into slack-bot/vantaca-claude.mjs.
//
// This is illustrative. You do NOT run this file; you copy the two marked
// snippets into the real bot at the points where it (1) reads vantaca_controls
// and (2) writes the vantaca_audit row. The audit object already has every
// field emitAudit() needs, so the change is ~3 lines.

import { emitAudit, emitPaused } from "./datadog.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// 1) START OF A REQUEST — right after the bot loads controls from Supabase.
//
//    const { data: controls } = await supabase
//      .from("vantaca_controls").select("*").eq("id", 1).maybeSingle();
//
//    >>> ADD:
//    emitPaused(!!controls?.paused);
//
//    if (controls?.paused) { /* refuse as today */ }
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 2) END OF A REQUEST — wherever the bot currently builds the audit row and
//    inserts it. Reuse the EXACT same object; just emit it to Datadog too.
//
//    Example of the existing write (yours may differ slightly in field names):
// ─────────────────────────────────────────────────────────────────────────────

async function exampleFinishRequest(supabase, audit) {
  // audit already looks like:
  // {
  //   question, answer, status, source, slack_user, ts,
  //   cost_usd, in_tok, out_tok, cache_r, turns, ms,
  //   tools:  ["agedWorkOrders", "stepItem"],
  //   writes: [{ tool: "stepItem", verified: true, isError: false, args: {...} }],
  // }

  await supabase.from("vantaca_audit").insert(audit); // <-- existing line

  emitAudit(audit); // <-- ADD THIS. Fire-and-forget; never throws.
}

// That's the whole integration. If a request errors before the audit object is
// fully built, still call emitAudit({ status: "TOOLS_FAIL", question, slack_user, ms })
// from your catch block so failures are visible in Datadog too.

export { exampleFinishRequest };
