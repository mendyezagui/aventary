// SoFa JCC associate — the daily scan, ported multi-tenant to secondbrain-os.
//
// Moved from database A on 2026-09-11 along with its five tables. The planning
// logic is untouched: the same pure modules the browser console imports, still
// pinned to commit 0abc8cb, so the cron and the console cannot disagree about
// what the scan saw.
//
// THE PIN IS A MAINTENANCE STEP, NOT A SET-AND-FORGET. Twice a fix landed on
// main while the function kept running the older commit — once leaving the wrong
// candle-lighting time in place. PINNED_SHA is echoed in every response and in
// every agentlog line, so a stale pin is visible instead of silent.
//
// What changed in the port, and why:
//
//  1. WHO IT RUNS FOR. planDay builds its upserts from the Hebcal calendar, not
//     from existing rows, so a scan pointed at an empty tenant does not no-op —
//     it cheerfully creates a full set of SoFa events for someone who has never
//     heard of SoFa. It therefore runs only for tenants with the `sofa_jcc`
//     module enabled, which is an explicit opt-in rather than an inference.
//  2. Every read is scoped to that tenant and every write sets tenant_id.
//     Service role bypasses RLS; a missing .eq("tenant_id") here would mean one
//     shul's calendar landing in another tenant's app.
//  3. hebcal_key is unique per tenant now, so the upsert conflicts on
//     "tenant_id,hebcal_key". Left as "hebcal_key" it would resolve against a
//     constraint that no longer exists and error on every event.
//  4. agentlogs has no identity on `id` in this database — it was imported with
//     explicit ids — so the log line allocates one per tenant and retries on
//     collision.
//  5. AUTH NO LONGER FAILS OPEN. The original guarded writes with
//     SOFA_SCAN_SECRET and skipped the check entirely when that variable was
//     unset, which is the wrong default anywhere and would have been a wide-open
//     write endpoint here, where that secret does not exist. It now requires
//     CRON_SECRET, the same bearer the rest of this project's crons use.
//
// The Hebcal location needed no secret: DEFAULT_ZIP = "90035" is baked into the
// pinned module, which is why A resolved to Pico-Robertson without one.
//
// Source of record: aventary repo, ops/sofa-jcc/sofa-jcc-scan.ts.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { planDay, renderFor } from "https://raw.githubusercontent.com/mendyezagui/second-brain/0abc8cbcb160afc3a633f58109eebfb3cd24bdd1/src/lib/sofa/agent.js";
import { isoDate } from "https://raw.githubusercontent.com/mendyezagui/second-brain/0abc8cbcb160afc3a633f58109eebfb3cd24bdd1/src/lib/sofa/hebcal.js";
import { ordersForFlyers, handoffPrompt } from "https://raw.githubusercontent.com/mendyezagui/second-brain/0abc8cbcb160afc3a633f58109eebfb3cd24bdd1/src/lib/sofa/dev.js";

// Keep in step with the three import URLs above.
const PINNED_SHA = "0abc8cbcb160afc3a633f58109eebfb3cd24bdd1";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** agentlogs has no identity on `id` here; allocate one per tenant, retry on collision. */
async function insertLog(T: string, row: Record<string, unknown>) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: top } = await sb.from("agentlogs").select("id")
      .eq("tenant_id", T).order("id", { ascending: false }).limit(1);
    const id = ((top?.[0]?.id as number) || 0) + 1 + attempt;
    const { error } = await sb.from("agentlogs").insert({ ...row, id, tenant_id: T });
    if (!error) return;
    if (error.code !== "23505") return; // a log line must never fail the scan
  }
}

async function log(T: string, type: string, message: string, priority = "medium") {
  try {
    await insertLog(T, {
      agent: "SoFa JCC",
      type,
      message,
      ts: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }),
      priority,
    });
  } catch (_) { /* logging must never fail the scan */ }
}

async function runScan(T: string, { today = isoDate(), dryRun = false }) {
  const [events, flyers, nudges, speakers] = await Promise.all([
    sb.from("sofa_events").select("*").eq("tenant_id", T),
    sb.from("sofa_flyers").select("*").eq("tenant_id", T),
    sb.from("sofa_nudges").select("dedupe_key").eq("tenant_id", T),
    sb.from("sofa_speakers").select("*").eq("tenant_id", T),
  ]);

  const speakersById = Object.fromEntries((speakers.data || []).map((s: any) => [s.id, s]));
  const plan = await planDay({
    today,
    existingEvents: events.data || [],
    existingFlyers: flyers.data || [],
    sentNudgeKeys: (nudges.data || []).map((n: any) => n.dedupe_key),
    speakersById,
    geonameid: Deno.env.get("SOFA_HEBCAL_GEONAMEID") || undefined,
    zip: Deno.env.get("SOFA_HEBCAL_ZIP") || undefined,
  });

  if (dryRun) return { tenant: T, ...plan, pinned_sha: PINNED_SHA, dryRun: true, applied: null };

  const applied = { events: 0, flyers: 0, nudges: 0, workOrders: 0 };
  const idByKey = new Map<string, number>(
    (events.data || []).filter((e: any) => e.hebcal_key).map((e: any) => [e.hebcal_key, e.id]),
  );

  // 1. Event rows, upserted on (tenant_id, hebcal_key) so a re-run updates in
  //    place. planDay already refuses to touch a candle time a human has
  //    confirmed; Hebcal's sunset model and the shul's luach do not agree, so
  //    the confirmation has to outrank the calculation.
  for (const u of plan.upserts) {
    const { reason: _reason, ...row } = u as any;
    const { data, error } = await sb
      .from("sofa_events")
      .upsert({ ...row, tenant_id: T, modified_by: "agent:sofa-jcc", modified_at: new Date().toISOString() },
              { onConflict: "tenant_id,hebcal_key" })
      .select("id,hebcal_key")
      .maybeSingle();
    if (!error && data) { idByKey.set(data.hebcal_key, data.id); applied.events++; }
  }

  const allEvents = (await sb.from("sofa_events").select("*").eq("tenant_id", T)).data || [];
  const eventById = Object.fromEntries(allEvents.map((e: any) => [e.id, e]));

  // 2. Flyer drafts. Copy stays deterministic here — this path never calls a
  //    model, so a scan can never invent a fact into a flyer.
  for (const d of plan.drafts as any[]) {
    const eventId = d.event_id ?? idByKey.get(d.event_key);
    if (!eventId) continue;
    const ev = eventById[eventId];
    if (!ev) continue;
    const speaker = ev.speaker_id ? speakersById[ev.speaker_id] : null;
    const copy = d.copy;

    const row: Record<string, unknown> = {
      tenant_id: T,
      event_id: eventId,
      template: d.template,
      version: d.version,
      status: d.status,
      missing: d.gaps,
      modified_by: "agent:sofa-jcc",
      modified_at: new Date().toISOString(),
      ...(copy ? { headline: copy.headline, subhead: copy.subhead, body: copy.body, footer: copy.footer } : {}),
    };
    try { row.html = renderFor(ev, { ...row, ...(copy || {}) }, speaker); } catch (_) { /* html is optional */ }

    if (d.flyer_id) await sb.from("sofa_flyers").update(row).eq("tenant_id", T).eq("id", d.flyer_id);
    else await sb.from("sofa_flyers").insert(row);
    applied.flyers++;
  }

  // 3. Nudges. dedupe_key is unique per tenant, so a re-run is a no-op rather
  //    than a second notification for the same event on the same lead day.
  for (const n of plan.nudges as any[]) {
    const eventId = n.event_id ?? idByKey.get(n.event_key);
    const { reason: _r, gaps: _g, event_key: _k, ...row } = n;
    const { error } = await sb.from("sofa_nudges").insert({
      ...row,
      tenant_id: T,
      event_id: eventId ?? null,
      status: "pending",
      channel: "",
      modified_by: "agent:sofa-jcc",
    });
    if (!error) applied.nudges++;
  }

  // 4. Hand finished work to the developer associate. Only a flyer with no gaps
  //    left becomes an order; a half-finished flyer is the business associate's
  //    problem. It reads STORED flyers rather than the plan's drafts, because a
  //    flyer usually turns ready days after it was drafted — on a run that emits
  //    no draft for it at all.
  const { data: existingOrders } = await sb.from("sofa_work_orders").select("dedupe_key").eq("tenant_id", T);
  const { data: currentFlyers } = await sb.from("sofa_flyers").select("*").eq("tenant_id", T);
  const orders = ordersForFlyers(currentFlyers || [], eventById, {
    existingKeys: (existingOrders || []).map((o: any) => o.dedupe_key),
  });
  for (const o of orders as any[]) {
    const { error } = await sb.from("sofa_work_orders")
      .insert({ ...o, tenant_id: T, handoff_prompt: handoffPrompt(o), modified_by: "agent:sofa-jcc" });
    if (!error) applied.workOrders++;
  }

  await log(
    T,
    "daily-scan",
    `${plan.summary} · applied ${applied.events} event(s), ${applied.flyers} flyer(s), ` +
      `${applied.nudges} nudge(s), ${applied.workOrders} work order(s). [edge @ ${PINNED_SHA.slice(0, 8)}]`,
    plan.nudges.some((n: any) => n.severity === "high") ? "high" : "medium",
  );

  return { tenant: T, ...plan, pinned_sha: PINNED_SHA, applied };
}

/**
 * Tenants that asked for this. planDay writes a calendar it derives from Hebcal
 * rather than from existing rows, so "no SoFa data yet" is not a safe proxy for
 * "does not want SoFa" — it is exactly the tenant a scan would fill with events
 * they never asked for.
 */
async function sofaTenants(): Promise<string[]> {
  const { data } = await sb.from("tenants").select("id,modules");
  return (data || []).filter((t: any) => t?.modules?.sofa_jcc === true).map((t: any) => t.id as string);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const authorized = !!CRON_SECRET && token === CRON_SECRET;

    const tenants = await sofaTenants();

    // The dry run writes nothing and is useful for checking, but it still reads
    // one tenant's calendar state, so it is behind the same bearer.
    if (!authorized) return json({ error: "unauthorized" }, 401);

    if (req.method === "GET") {
      const out = [];
      for (const T of tenants) out.push(await runScan(T, { dryRun: true }));
      return json({ pinned_sha: PINNED_SHA, tenants: out.length, out });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const out = [];
    for (const T of tenants) out.push(await runScan(T, { today: body.today, dryRun: !!body.dry_run }));
    return json({ pinned_sha: PINNED_SHA, tenants: out.length, out });
  } catch (err) {
    console.error("sofa-jcc-scan failed:", err);
    return json({ error: String(err) }, 500);
  }
});
