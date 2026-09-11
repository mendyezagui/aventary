// The associate runtime — one scheduler for every associate, multi-tenant.
//
// Ported from database A (xwacfwagyhgbbhefecdt) to B (fukehjqikxqsntwhmgsk) on
// 2026-09-11. The planning logic is byte-for-byte the same modules the browser
// console runs, pinned to a commit, so the cron and the console can never
// disagree about what an associate saw. What changed in the port is only the
// IO, and all of it for one reason: B is multi-tenant and A was not.
//
//   1. Every read is scoped to one tenant. Service role bypasses RLS, so a
//      forgotten .eq("tenant_id") would hand Mendy's associate Jim's pipeline.
//      That is the exact failure this whole consolidation exists to end.
//   2. Every write sets tenant_id explicitly, for the same reason.
//   3. agentlogs, ai_memories, documents and tasks have no identity on `id` in
//      B (they were imported with explicit ids), so the runtime allocates one
//      per tenant and retries on collision. associates/associate_runs/
//      associate_drafts do have identity and are left to the database.
//   4. verify_jwt is OFF and the token is checked here instead, matching
//      loops-dispatcher and the rest of B: CRON_SECRET runs every tenant, a
//      signed-in user's JWT runs only their own.
//
//   GET                                   -> dry run of the whole tick, writes nothing
//   POST { action: "tick" }               -> run everyone who is due
//   POST { action: "run", slug, ... }     -> run one now (what the console calls)
//   POST { ..., dry_run: true }           -> plan only, no model call, no writes
//
// Draft-and-hold, per docs/proactive-orchestrator-spec.md section 5: this
// function writes runs, drafts, memories and tasks. It has no send path —
// no email, no post, no outbound message of any kind.
//
// Source of record: aventary repo, ops/associates-runtime/associate-tick.ts.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Pinned deliberately. Bump both URLs together and redeploy when you want the
// cron to pick up new core logic; a push to main must never change what runs
// tonight on its own.
import { planTick, planAssociate, isoDate, missingSentence } from "https://raw.githubusercontent.com/mendyezagui/second-brain/2385386a00feb694aef97fa343d35758f7200e83/src/lib/associates/core.js";
import { tablesFor } from "https://raw.githubusercontent.com/mendyezagui/second-brain/2385386a00feb694aef97fa343d35758f7200e83/src/lib/associates/context.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const sb = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

/**
 * Insert into a table whose `id` has no identity in B.
 *
 * Ids are per-tenant and allocated by reading the current maximum, which two
 * associates running in the same wave can do at the same moment. Rather than
 * serialise the whole tick to avoid that, take the collision and retry: the
 * loser of a race is one extra round trip, not a lost artifact.
 */
async function insertWithId(table: string, T: string, row: Record<string, unknown>) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: top } = await sb.from(table).select("id")
      .eq("tenant_id", T).order("id", { ascending: false }).limit(1);
    const id = ((top?.[0]?.id as number) || 0) + 1 + attempt;
    const { data, error } = await sb.from(table)
      .insert({ ...row, id, tenant_id: T }).select("id").maybeSingle();
    if (!error) return data;
    if (error.code !== "23505") throw new Error(`${table}: ${error.message}`);
  }
  throw new Error(`${table}: could not allocate an id after 6 attempts`);
}

async function log(T: string, type: string, message: string, priority = "medium") {
  try {
    await insertWithId("agentlogs", T, {
      agent: "Associates",
      type,
      message,
      ts: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }),
      priority,
    });
  } catch (_) { /* logging must never fail a run */ }
}

/**
 * The model call. Kept here rather than behind /api/claude because that route
 * does not exist on the host the app is served from.
 *
 * A missing key is reported as a real error on the run row. Silently producing
 * nothing is how an agent rots for three months without anyone noticing.
 */
async function callClaude(system: string, user: string, model: string, maxTokens: number) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on this function. Supabase → Edge Functions → associate-tick → Secrets.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const d = await res.json().catch(() => null);
  if (!res.ok) throw new Error(d?.error?.message || `Anthropic HTTP ${res.status}`);
  const text = d?.content?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) throw new Error("Model returned an empty response.");
  return { text, tokens: d?.usage?.output_tokens ?? null };
}

/**
 * Load only the tables the due associates actually declared, for one tenant. A
 * quiet morning costs one query, not a full snapshot of the Second Brain.
 *
 * A table an associate declares but B does not have yet comes back empty AND
 * named in `missing`. Empty-and-silent is how an associate looks like it ran
 * fine for a month while reading nothing.
 */
async function loadSources(T: string, associates: any[], needLinked: boolean) {
  const names = new Set<string>();
  for (const a of associates) for (const t of tablesFor(a.inputs || {})) names.add(t);
  // A scoped run also reads the records it was pointed at, plus what hangs off them.
  if (needLinked) ["contacts", "companies", "deals", "projects", "documents", "ai_memories", "tasks"].forEach((t) => names.add(t));

  const list = [...names];
  const results = await Promise.all(list.map((t) => sb.from(t).select("*").eq("tenant_id", T)));
  const sources: Record<string, any[]> = {};
  const missing: string[] = [];
  list.forEach((t, i) => {
    if (results[i].error) missing.push(t);
    sources[t] = results[i].data || [];
  });
  return { sources, missing };
}

/**
 * Execute one planned associate. The plan is already decided — this only does
 * the IO, so a failure here cannot change what the associate intended to do.
 */
async function execute(T: string, associate: any, plan: any, { dryRun = false } = {}) {
  const started = Date.now();
  const base = {
    tenant_id: T,
    associate_id: associate.id,
    slug: associate.slug,
    run_key: plan.run_key,
    trigger: plan.trigger,
    input_digest: plan.context.digest,
    gaps: plan.gaps,
    model: associate.model,
    modified_by: "agent:associate-tick",
  };

  // An associate with nothing to read records the fact and stops. This is a
  // successful outcome, not an error, and it costs no model call.
  if (plan.skip === "no_input") {
    if (dryRun) return { ...plan, wrote: null };
    const { data } = await sb.from("associate_runs")
      .insert({ ...base, status: "no_input", summary: plan.summary, finished_at: new Date().toISOString(), duration_ms: Date.now() - started })
      .select("id").maybeSingle();
    return { ...plan, run_id: data?.id ?? null, wrote: { run: 1 } };
  }

  if (dryRun) return { ...plan, wrote: null, system: plan.system, user_preview: plan.user.slice(0, 600) };

  let text = "", tokens: number | null = null, error = "";
  try {
    const out = await callClaude(plan.system, plan.user, associate.model || "claude-sonnet-4-6", associate.max_tokens || 2200);
    text = out.text; tokens = out.tokens;
  } catch (e) {
    error = String((e as Error)?.message || e);
  }

  const { data: run } = await sb.from("associate_runs").insert({
    ...base,
    status: error ? "error" : "ok",
    summary: error ? `${associate.label}: ${error}` : plan.summary,
    output: text,
    error,
    tokens_out: tokens,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
  }).select("id").maybeSingle();

  if (error) return { ...plan, run_id: run?.id ?? null, status: "error", error, wrote: { run: 1 } };

  const rails = associate.rails || {};
  const wrote: Record<string, number> = { run: 1 };
  const now = new Date().toISOString();

  // 1. The draft. Versioned rather than overwritten: dedupe_key collides on a
  //    same-day re-run, and the update bumps the version so you can still see
  //    what it said before.
  if (rails.save_draft !== false) {
    const { data: prior } = await sb.from("associate_drafts")
      .select("id,version").eq("tenant_id", T).eq("dedupe_key", plan.draft.dedupe_key).maybeSingle();
    const row = {
      tenant_id: T,
      associate_id: associate.id,
      run_id: run?.id ?? null,
      slug: associate.slug,
      kind: plan.draft.kind,
      title: plan.draft.title,
      body: text,
      status: plan.draft.status,
      gaps: plan.gaps,
      version: (prior?.version || 0) + 1,
      dedupe_key: plan.draft.dedupe_key,
      contactId: plan.draft.contactId,
      companyId: plan.draft.companyId,
      dealId: plan.draft.dealId,
      projectId: plan.draft.projectId,
      modified_by: "agent:associate-tick",
      modified_at: now,
    };
    if (prior) await sb.from("associate_drafts").update(row).eq("tenant_id", T).eq("id", prior.id);
    else await sb.from("associate_drafts").insert(row);
    wrote.draft = 1;
  }

  // 2. Memory — so the next run of any associate can see what this one concluded.
  if (rails.save_memory) {
    await insertWithId("ai_memories", T, {
      subject: plan.draft.title,
      ai_system: "claude",
      memory_summary: text,
      memory_type: "context",
      source_context: `associates/${associate.slug}`,
      contactId: plan.draft.contactId,
      companyId: plan.draft.companyId,
      dealId: plan.draft.dealId,
      projectId: plan.draft.projectId,
      modified_by: "agent:associate-tick",
    });
    wrote.memory = 1;
  }

  // 3. Document, for the artifacts worth filing (SOWs, proposals, specs).
  if (rails.save_document) {
    const associations = [
      plan.draft.contactId && { type: "contact", id: plan.draft.contactId },
      plan.draft.companyId && { type: "company", id: plan.draft.companyId },
      plan.draft.dealId && { type: "deal", id: plan.draft.dealId },
      plan.draft.projectId && { type: "project", id: plan.draft.projectId },
    ].filter(Boolean);
    await insertWithId("documents", T, {
      title: plan.draft.title,
      description: text,
      kind: "generated",
      associations,
      created_at: now,
      modified_by: "agent:associate-tick",
    });
    wrote.document = 1;
  }

  // 4. A follow-up task. Deliberately last and deliberately optional — an
  //    associate that creates a task on every run just builds a second inbox.
  if (rails.create_task) {
    const missing = missingSentence(plan.gaps);
    await insertWithId("tasks", T, {
      title: missing ? `${associate.label}: needs ${missing}` : `Review: ${plan.draft.title}`,
      due: plan.today,
      priority: missing ? "high" : "medium",
      status: "todo",
      category: "follow_up",
      source: `agent:${associate.slug}`,
      contactId: plan.draft.contactId,
      companyId: plan.draft.companyId,
      dealId: plan.draft.dealId,
      projectId: plan.draft.projectId,
      notes: `Created by the ${associate.label} run on ${plan.today}.`,
      modified_by: "agent:associate-tick",
    });
    wrote.task = 1;
  }

  await sb.from("associates").update({ last_run_at: now, modified_at: now })
    .eq("tenant_id", T).eq("id", associate.id);

  return { ...plan, run_id: run?.id ?? null, status: "ok", wrote, output: text };
}

/** The whole tick for one tenant: who is due, then run each one. */
async function runTick(T: string, { dryRun = false, now = new Date() } = {}) {
  const { data: roster } = await sb.from("associates").select("*")
    .eq("tenant_id", T).eq("active", true).order("sort_order");
  const associates = roster || [];

  // Today's run keys, so a tick that fires twice is a no-op the second time.
  const { data: runsToday } = await sb.from("associate_runs")
    .select("run_key").eq("tenant_id", T).gte("started_at", isoDate(now) + "T00:00:00Z");
  const alreadyRan = new Set((runsToday || []).map((r: any) => r.run_key));

  const plan = planTick(associates, { now, alreadyRan });
  if (plan.due.length === 0) {
    return { tenant: T, ...plan, dryRun, results: [], note: "nothing due" };
  }

  const dueAssociates = plan.due.map((d: any) => d.associate);
  const { sources, missing } = await loadSources(T, dueAssociates, false);

  // Run them concurrently, in bounded waves. A single associate takes ~45s
  // end to end, and the cron's pg_net call times out at 55s — sequential
  // execution would mean the second associate to come due on any given day
  // silently never finishes. Waves of 4 keep total wall time at roughly one
  // associate regardless of roster size, without opening 20 model calls at
  // once. Each run has its own unique run_key, so concurrency cannot make
  // two associates collide.
  const WAVE = 4;
  const results: any[] = [];
  for (let i = 0; i < dueAssociates.length; i += WAVE) {
    const wave = dueAssociates.slice(i, i + WAVE);
    results.push(...await Promise.all(wave.map((a: any) =>
      execute(T, a, planAssociate(a, sources, { now, trigger: "cron" }), { dryRun })
        // One associate blowing up must not take the rest of the tick with it.
        .catch((e: any) => ({ slug: a.slug, status: "error", error: String(e?.message || e), wrote: null })),
    )));
  }

  if (!dryRun) {
    const ok = results.filter((r: any) => r.status === "ok").length;
    const errs = results.filter((r: any) => r.status === "error");
    await log(
      T, "tick",
      `${plan.summary} · ${ok} ok, ${results.filter((r: any) => r.skip === "no_input").length} no-input, ${errs.length} error(s)` +
        (errs.length ? ` — ${errs.map((e: any) => `${e.slug}: ${e.error}`).join("; ")}` : "") +
        (missing.length ? ` — table(s) not in this database: ${missing.join(", ")}` : ""),
      errs.length || missing.length ? "high" : "medium",
    );
  }

  return { tenant: T, ...plan, dryRun, missing_tables: missing, results };
}

/** One associate, on demand. This is what the console's Run button calls. */
async function runOne(T: string, { slug, instructions = "", link = {}, answers = {}, dryRun = false, now = new Date() }) {
  const { data: associate } = await sb.from("associates").select("*")
    .eq("tenant_id", T).eq("slug", slug).maybeSingle();
  if (!associate) return { error: `No associate with slug '${slug}'.` };
  if (associate.runtime === "custom") {
    return { error: `'${slug}' has a custom runtime (${associate.console || "its own console"}) — run it there, not here.` };
  }

  const needLinked = (associate.inputs?.linked !== false);
  const { sources, missing } = await loadSources(T, [associate], needLinked);
  const plan = planAssociate(associate, sources, { now, trigger: "manual", link, instructions, answers });
  const result = await execute(T, associate, plan, { dryRun });

  if (!dryRun) {
    await log(T, "run", `${associate.label} (manual) — ${result.status === "error" ? result.error : plan.summary}` +
      (missing.length ? ` — table(s) not in this database: ${missing.join(", ")}` : ""),
      result.status === "error" ? "high" : "low");
  }
  return { ...result, missing_tables: missing };
}

/** Every tenant, for the cron. A tenant with no associates costs two queries. */
async function allTenants() {
  const { data } = await sb.from("tenants").select("id");
  return (data || []).map((t: any) => t.id as string);
}

/**
 * Who is asking, and therefore whose rows they get.
 *
 * The shared secret is the cron and runs everyone. Anything else must be a
 * signed-in user, and gets exactly one tenant: their own. There is no third
 * case — an unauthenticated caller cannot spend model credits and cannot read
 * another tenant's pipeline.
 */
async function resolveTenants(req: Request): Promise<{ mode: string; tenants: string[] } | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (CRON_SECRET && token === CRON_SECRET) return { mode: "cron", tenants: await allTenants() };

  const { data: { user }, error } = await createClient(URL_, ANON, { auth: { persistSession: false } }).auth.getUser(token);
  if (error || !user) return null;
  const { data: mem } = await sb.from("tenant_members").select("tenant_id").eq("user_id", user.id).limit(1);
  const T = mem?.[0]?.tenant_id as string | undefined;
  if (!T) return null;
  return { mode: "app", tenants: [T] };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const who = await resolveTenants(req);
    if (!who) return json({ error: "unauthorized" }, 401);
    if (who.tenants.length === 0) return json({ error: "no tenant" }, 403);

    // The dry run writes nothing and calls no model, so it is the safe way to
    // see what tonight would do.
    if (req.method === "GET") {
      const out = [];
      for (const T of who.tenants) out.push(await runTick(T, { dryRun: true }));
      return json({ mode: who.mode, tenants: out.length, out });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const now = body.now ? new Date(body.now) : new Date();

    if (body.action === "run") {
      if (!body.slug) return json({ error: "action 'run' needs a slug" }, 400);
      // A scoped run names one associate, which lives in exactly one tenant.
      // Running it "for every tenant" would be a different thing entirely.
      if (who.tenants.length !== 1) return json({ error: "action 'run' needs a user token, not the cron secret" }, 400);
      return json(await runOne(who.tenants[0], {
        slug: body.slug,
        instructions: body.instructions || "",
        link: body.link || {},
        answers: body.answers || {},
        dryRun: !!body.dry_run,
        now,
      }));
    }

    const out = [];
    for (const T of who.tenants) out.push(await runTick(T, { dryRun: !!body.dry_run, now }));
    return json({ mode: who.mode, tenants: out.length, out });
  } catch (err) {
    console.error("associate-tick failed:", err);
    return json({ error: String(err) }, 500);
  }
});
