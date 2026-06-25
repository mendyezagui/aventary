// loops-dispatch — runs enabled automation loops.
//
// Per-loop publish policy (no global switch):
//   • signal_brief       record a tracking run for the Morning Brief, which is
//                        already auto-published to /intelligence by the Cloudflare
//                        worker. Status 'published'.
//   • content_from_brief draft an Insights article from the brief signals and
//                        AUTO-PUBLISH it to /insights (insert a posts row), status
//                        'published'. The LinkedIn post + newsletter blurb are also
//                        drafted and stored on the run for the (gated) outreach
//                        loop later — they are NOT sent here. If a loop's config
//                        sets publish_mode != 'auto_post', it falls back to the old
//                        'drafted' (gated) behaviour.
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
//   ?dry=1   fetch signals + assemble the prompt, but do NOT call Claude or write
//            rows. Returns the prompt + signal count per loop.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// JSON Schema for the drafted content. Passed as output_config.format so the
// Messages API guarantees valid, schema-conforming JSON — this removes the old
// fragile "regex-extract a {...} blob then JSON.parse" path, which broke whenever
// the Markdown body contained an unescaped quote or control character.
const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "post_title",
    "post_excerpt",
    "post_body_md",
    "linkedin_post",
    "newsletter_subject",
    "newsletter_body",
    "source_url",
  ],
  properties: {
    post_title: { type: "string" },
    post_excerpt: { type: "string" },
    post_body_md: { type: "string" },
    linkedin_post: { type: "string" },
    newsletter_subject: { type: "string" },
    newsletter_body: { type: "string" },
    source_url: { type: "string" },
  },
} as const;

type Signal = {
  rank?: number;
  name?: string;
  title?: string;
  bullets?: string[];
  url?: string;
  why_top5?: string;
};

type Loop = {
  id: string;
  slug: string;
  kind: string;
  config: Record<string, unknown>;
};

type SupabaseClient = ReturnType<typeof createClient>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// UTC date (YYYY-MM-DD) — matches loop_runs.run_date default (current_date) so a
// loop is idempotent per day, and gives a stable per-day post slug.
function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function fetchSignals(cfg: Record<string, unknown>): Promise<Signal[]> {
  const signalUrl = String(cfg.signal_url ?? "");
  const maxSignals = Number(cfg.max_signals ?? 5);
  const briefRes = await fetch(signalUrl, { headers: { accept: "application/json" } });
  if (!briefRes.ok) throw new Error(`signal fetch ${briefRes.status}`);
  const brief = await briefRes.json();
  const signals: Signal[] = (brief?.top5 ?? []).slice(0, maxSignals);
  if (signals.length === 0) throw new Error("no signals in brief");
  return signals;
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

Below are today's top AI / GTM signals. Pick the ONE most relevant to Aventary's audience and produce THREE things off it:

1. An Insights article (this auto-publishes to the website, so it must stand on its own and be genuinely useful):
   - post_title: a specific, non-clickbait headline (<= 70 chars)
   - post_excerpt: a 1-2 sentence dek (<= 200 chars)
   - post_body_md: 350-550 words of Markdown. Use 2-3 "## " section headings, a concrete point of view grounded in the signal, and an actionable takeaway. Link the source once with a Markdown link. No "In conclusion", no filler.
2. A LinkedIn post (120-220 words): strong hook, concrete POV, a closing line that invites discussion. 1-2 hashtags max, optional.
3. A short newsletter blurb: a subject line (<= 70 chars) and a 90-150 word body.

Signals:
${items}

Populate every field of the response. source_url is the URL of the signal you chose.`;
}

type Draft = {
  post_title: string;
  post_excerpt: string;
  post_body_md: string;
  linkedin_post: string;
  newsletter_subject: string;
  newsletter_body: string;
  source_url?: string;
};

async function draftWithClaude(apiKey: string, prompt: string): Promise<Draft> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      // Structured outputs: the API constrains the response to valid JSON that
      // matches DRAFT_SCHEMA, so no regex extraction / lenient parsing is needed.
      output_config: { format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();

  // Surface real failures honestly instead of producing a half-formed post.
  if (data?.stop_reason === "refusal") {
    throw new Error("Anthropic refused the request (stop_reason: refusal)");
  }
  if (data?.stop_reason === "max_tokens") {
    throw new Error("draft truncated (stop_reason: max_tokens) — raise max_tokens");
  }

  const textBlock = (data?.content ?? []).find(
    (b: { type?: string }) => b?.type === "text",
  );
  const text: string = textBlock?.text ?? "";
  if (!text) throw new Error("empty model output");
  // Guaranteed valid JSON via output_config.format — parse directly.
  return JSON.parse(text) as Draft;
}

// ---------------------------------------------------------------- kind: signal_brief
// The brief is auto-published by the Cloudflare worker. Record a tracking run so
// it shows up in /admin/loops alongside everything else.
async function runSignalBrief(sb: SupabaseClient, loop: Loop, dry: boolean) {
  const signals = await fetchSignals(loop.config);
  const publicUrl = String(loop.config.public_url ?? "https://aventary.com/intelligence");
  const output = {
    public_url: publicUrl,
    signal_count: signals.length,
    titles: signals.map((s) => s.title).filter(Boolean),
  };

  if (dry) return { loop: loop.slug, kind: loop.kind, dry: true, ...output };

  const { error } = await sb.from("loop_runs").upsert(
    {
      loop_id: loop.id,
      status: "published",
      title: `Signal brief — ${output.signal_count} signals`,
      output,
      published_at: new Date().toISOString(),
      error: null,
    },
    { onConflict: "loop_id,run_date" },
  );
  if (error) throw new Error(error.message);
  return { loop: loop.slug, kind: loop.kind, status: "published", ...output };
}

// ------------------------------------------------------------ kind: content_from_brief
async function runContent(
  sb: SupabaseClient,
  loop: Loop,
  dry: boolean,
  anthropicKey: string | undefined,
) {
  const cfg = loop.config;
  const signals = await fetchSignals(cfg);
  const prompt = buildPrompt(signals);

  if (dry) {
    return { loop: loop.slug, kind: loop.kind, dry: true, signal_count: signals.length, prompt };
  }

  if (!anthropicKey) {
    await sb.from("loop_runs").upsert(
      { loop_id: loop.id, status: "failed", error: "ANTHROPIC_API_KEY not set", signals },
      { onConflict: "loop_id,run_date" },
    );
    return { loop: loop.slug, kind: loop.kind, status: "failed", error: "ANTHROPIC_API_KEY not set" };
  }

  const draft = await draftWithClaude(anthropicKey, prompt);
  const autoPublish = String(cfg.publish_mode ?? "") === "auto_post";

  let postSlug: string | null = null;
  let publishedAt: string | null = null;

  if (autoPublish && draft.post_title && draft.post_body_md) {
    const prefix = String(cfg.slug_prefix ?? "signal");
    postSlug = `${prefix}-${utcDate()}`;
    // Keep slug unique even if a second run happens the same day.
    if (draft.post_title) postSlug = `${prefix}-${utcDate()}-${slugify(draft.post_title)}`.slice(0, 80);
    publishedAt = new Date().toISOString();

    const { error: postErr } = await sb.from("posts").upsert(
      {
        slug: postSlug,
        title: draft.post_title,
        excerpt: draft.post_excerpt ?? null,
        body_md: draft.post_body_md,
        published_at: publishedAt,
      },
      { onConflict: "slug" },
    );
    if (postErr) throw new Error(`post publish failed: ${postErr.message}`);
  }

  const { error: runErr } = await sb.from("loop_runs").upsert(
    {
      loop_id: loop.id,
      status: postSlug ? "published" : "drafted",
      title: draft.newsletter_subject ?? draft.post_title ?? null,
      linkedin_post: draft.linkedin_post ?? null,
      newsletter_subject: draft.newsletter_subject ?? null,
      newsletter_body: draft.newsletter_body ?? null,
      post_slug: postSlug,
      published_at: publishedAt,
      signals,
      model: MODEL,
      error: null,
    },
    { onConflict: "loop_id,run_date" },
  );
  if (runErr) throw new Error(runErr.message);

  return {
    loop: loop.slug,
    kind: loop.kind,
    status: postSlug ? "published" : "drafted",
    post_slug: postSlug,
    signal_count: signals.length,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const secret = Deno.env.get("LOOPS_DISPATCH_SECRET");
  if (secret && req.headers.get("x-loops-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const dry = new URL(req.url).searchParams.has("dry");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: loops, error: loopErr } = await sb
    .from("loops")
    .select("id, slug, kind, config")
    .eq("enabled", true);
  if (loopErr) return json({ error: loopErr.message }, 500);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const results: unknown[] = [];

  for (const raw of loops ?? []) {
    const loop: Loop = { ...raw, config: (raw.config ?? {}) as Record<string, unknown> };
    try {
      if (loop.kind === "signal_brief") {
        results.push(await runSignalBrief(sb, loop, dry));
      } else if (loop.kind === "content_from_brief") {
        results.push(await runContent(sb, loop, dry, anthropicKey));
      } else {
        results.push({ loop: loop.slug, kind: loop.kind, status: "skipped", reason: "unknown kind" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!dry) {
        await sb.from("loop_runs").upsert(
          { loop_id: loop.id, status: "failed", error: msg },
          { onConflict: "loop_id,run_date" },
        );
      }
      results.push({ loop: loop.slug, kind: loop.kind, status: "failed", error: msg });
    }
  }

  return json({ ran_at: new Date().toISOString(), dry, results });
});
