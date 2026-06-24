// loops-dispatch — runs enabled automation loops and writes drafts for review.
//
// Loop kind 'content_from_brief': fetch the Morning Brief signals, ask Claude to
// draft a LinkedIn post + newsletter blurb, insert a loop_runs row (status
// 'drafted'). The admin Loops tab reviews and approves; sending happens in the
// Next.js app (Resend).
//
// Auth: caller must present  x-loops-secret: <LOOPS_DISPATCH_SECRET>.
// Triggered daily by pg_cron (reads the secret from Supabase Vault).
//
// Env (set as Edge Function secrets):
//   LOOPS_DISPATCH_SECRET   shared secret matching the cron caller
//   ANTHROPIC_API_KEY       for drafting
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   injected automatically
//
// Query params:
//   ?dry=1   fetch signals + assemble the prompt, but do NOT call Claude or
//            write rows. Returns the prompt + signal count. Lets you verify the
//            data pipeline before the ANTHROPIC_API_KEY is set.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

type Signal = {
  rank?: number;
  name?: string;
  title?: string;
  bullets?: string[];
  url?: string;
  why_top5?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildPrompt(signals: Signal[]): string {
  const items = signals
    .map((s, i) => {
      const bullets = (s.bullets ?? []).map((b) => `   - ${b}`).join("\n");
      return [
        `${i + 1}. ${s.title ?? "(untitled)"} — ${s.name ?? "unknown"}`,
        bullets,
        s.why_top5 ? `   why it matters: ${s.why_top5}` : "",
        s.url ? `   source: ${s.url}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return `You write for Aventary — an AI-first fractional product/RevOps leadership firm for non-tech companies. Voice: sharp, practitioner, specific, no hype, no emoji-spam. The audience is operators and execs deciding how to actually use AI.

Below are today's top AI / GTM signals. Pick the ONE most relevant to Aventary's audience and write:
1. A LinkedIn post (120-220 words): a strong hook, a concrete point of view grounded in the signal, and a closing line that invites discussion. No hashtags-stuffing (1-2 max, optional).
2. A short newsletter blurb: a subject line (<= 70 chars) and a 90-150 word body that summarizes the takeaway and what an operator should do about it.

Signals:
${items}

Return ONLY valid JSON, no prose, in exactly this shape:
{"linkedin_post": "...", "newsletter_subject": "...", "newsletter_body": "...", "source_url": "..."}
where source_url is the URL of the signal you chose.`;
}

async function draftWithClaude(apiKey: string, prompt: string) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  // Be tolerant of stray prose / code fences around the JSON.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in model output: ${text.slice(0, 300)}`);
  return JSON.parse(match[0]) as {
    linkedin_post: string;
    newsletter_subject: string;
    newsletter_body: string;
    source_url?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const secret = Deno.env.get("LOOPS_DISPATCH_SECRET");
  if (secret && req.headers.get("x-loops-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const dry = new URL(req.url).searchParams.has("dry");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: loops, error: loopErr } = await supabase
    .from("loops")
    .select("id, slug, kind, config")
    .eq("enabled", true)
    .eq("kind", "content_from_brief");

  if (loopErr) return json({ error: loopErr.message }, 500);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const results: unknown[] = [];

  for (const loop of loops ?? []) {
    const cfg = (loop.config ?? {}) as Record<string, unknown>;
    const signalUrl = String(cfg.signal_url ?? "");
    const maxSignals = Number(cfg.max_signals ?? 5);

    try {
      const briefRes = await fetch(signalUrl, { headers: { accept: "application/json" } });
      if (!briefRes.ok) throw new Error(`signal fetch ${briefRes.status}`);
      const brief = await briefRes.json();
      const signals: Signal[] = (brief?.top5 ?? []).slice(0, maxSignals);
      if (signals.length === 0) throw new Error("no signals in brief");

      const prompt = buildPrompt(signals);

      if (dry) {
        results.push({ loop: loop.slug, dry: true, signal_count: signals.length, prompt });
        continue;
      }

      if (!anthropicKey) {
        // Record a visible failure rather than silently skipping.
        await supabase.from("loop_runs").upsert(
          { loop_id: loop.id, status: "failed", error: "ANTHROPIC_API_KEY not set", signals },
          { onConflict: "loop_id,run_date" },
        );
        results.push({ loop: loop.slug, status: "failed", error: "ANTHROPIC_API_KEY not set" });
        continue;
      }

      const draft = await draftWithClaude(anthropicKey, prompt);

      const { error: insErr } = await supabase.from("loop_runs").upsert(
        {
          loop_id: loop.id,
          status: "drafted",
          title: draft.newsletter_subject ?? null,
          linkedin_post: draft.linkedin_post ?? null,
          newsletter_subject: draft.newsletter_subject ?? null,
          newsletter_body: draft.newsletter_body ?? null,
          signals,
          model: MODEL,
          error: null,
        },
        { onConflict: "loop_id,run_date" },
      );
      if (insErr) throw new Error(insErr.message);

      results.push({ loop: loop.slug, status: "drafted", signal_count: signals.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!dry) {
        await supabase.from("loop_runs").upsert(
          { loop_id: loop.id, status: "failed", error: msg },
          { onConflict: "loop_id,run_date" },
        );
      }
      results.push({ loop: loop.slug, status: "failed", error: msg });
    }
  }

  return json({ ran_at: new Date().toISOString(), dry, results });
});
