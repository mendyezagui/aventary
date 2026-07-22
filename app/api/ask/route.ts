import Anthropic from "@anthropic-ai/sdk";
import { ASK_MODEL, ASK_SYSTEM } from "@/lib/ask-knowledge";

// "Ask Aventary" chat endpoint. Streams a Claude answer grounded in the
// Aventary knowledge pack. Public, so it's hard-capped and lightly rate-limited;
// the real abuse protection (Turnstile + a Cloudflare rate-limit rule on this
// path) is configured in the dashboard — see the deploy notes.

const MAX_MESSAGES = 12; // trailing turns kept
const MAX_CHARS_PER_MSG = 2000;
const MAX_TOTAL_CHARS = 8000;
const MAX_OUTPUT_TOKENS = 700;

// Best-effort per-isolate limiter. Not authoritative on Workers (isolates are
// ephemeral and many) — it's a speed bump, not the gate. Pair with a Cloudflare
// Rate Limiting rule on /api/ask for real enforcement.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 25;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    // keep the map from growing unbounded on a long-lived isolate
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_PER_WINDOW;
}

type Msg = { role: "user" | "assistant"; content: string };

function sanitize(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Msg[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as any).role;
    const content = (m as any).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_CHARS_PER_MSG);
    if (text) out.push({ role, content: text });
  }
  const trimmed = out.slice(-MAX_MESSAGES);
  // Must be a real conversation ending in a user turn.
  if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") return null;
  if (trimmed.reduce((n, m) => n + m.content.length, 0) > MAX_TOTAL_CHARS) {
    return trimmed.slice(-4);
  }
  return trimmed;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  if (rateLimited(ip)) {
    return new Response("You've hit the limit for now. Book a working session at /appointments.", {
      status: 429
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const messages = sanitize((body as any)?.messages);
  if (!messages) return new Response("no message", { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // Graceful: the widget shows this as a normal assistant line.
    return new Response(
      "Ask Aventary isn't switched on yet. In the meantime, run the free diagnostic at /diagnostic or book a working session at /appointments.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const client = new Anthropic({ apiKey: key });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msg = client.messages.stream({
          model: ASK_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral" } }],
          messages
        });
        for await (const event of msg) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error("ask stream error", err);
        controller.enqueue(
          encoder.encode(
            "\n\nSomething went wrong on my end. Try again, or book a working session at /appointments."
          )
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
