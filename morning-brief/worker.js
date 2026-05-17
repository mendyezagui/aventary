/**
 * Morning Brief Worker — aventary.com
 * Runs daily at 6 AM PST via Cloudflare Cron Trigger
 * Scans 30 voices, surfaces top 5, stores in KV
 */

const VOICES = [
  // AI Practitioners
  { name: "Ethan Mollick",       x: "@emollick",       li: "ethan-mollick",     category: "AI Practitioners" },
  { name: "Allie K. Miller",     x: "@alliekmiller",   li: "alliekmiller",      category: "AI Practitioners" },
  { name: "Paul Roetzer",        x: "@paulroetzer",    li: "paulroetzer",       category: "AI Practitioners" },
  { name: "Matt Wolfe",          x: "@mreflow",        li: "mattwolfe",         category: "AI Practitioners" },
  { name: "Kieran Flanagan",     x: "@searchbrat",     li: "kieranjflanagan",   category: "AI Practitioners" },
  { name: "Nate Jones",          x: "@natebjones",     li: "natebjones",        category: "AI Practitioners" },
  { name: "Lenny Rachitsky",     x: "@lennysan",       li: "lennyrachitsky",    category: "AI Practitioners" },
  { name: "Andrew Ng",           x: "@AndrewYNg",      li: "andrewyng",         category: "AI Practitioners" },
  { name: "Dave Kellogg",        x: "@kellblog",       li: "davekellogg",       category: "AI Practitioners" },
  { name: "Joanna Stern",        x: "@JoannaStern",    li: "joannastern",       category: "AI Practitioners" },
  // Salesforce / Agentforce
  { name: "Salesforce Ben",      x: "@salesforceben",  li: "benmccarthy90",     category: "Salesforce / Agentforce" },
  { name: "Rakesh Gupta",        x: "@iamrakeshgupta", li: "iamrakeshgupta",    category: "Salesforce / Agentforce" },
  { name: "Clara Shih",          x: "@claraoshin",     li: "claraoshin",        category: "Salesforce / Agentforce" },
  { name: "Adam Evans",          x: "@adamevans_sf",   li: "adamevans",         category: "Salesforce / Agentforce" },
  { name: "Vanessa Grant",       x: "@vgrant411",      li: "vanessagrant411",   category: "Salesforce / Agentforce" },
  { name: "Mike Gerholdt",       x: "@MikeGerholdt",   li: "mikegerholdt",      category: "Salesforce / Agentforce" },
  { name: "Josh Birk",           x: "@joshbirk",       li: "joshbirk",          category: "Salesforce / Agentforce" },
  { name: "Jennifer Lee",        x: "@jenwlee",        li: "jenwlee",           category: "Salesforce / Agentforce" },
  { name: "Ketan Karkhanis",     x: "@ketankarkh",     li: "ketankarkhanis",    category: "Salesforce / Agentforce" },
  { name: "David Liu",           x: "@davidiholiu",    li: "davidliu",          category: "Salesforce / Agentforce" },
  // Revenue Operations
  { name: "Rosalyn Santa Elena", x: "@rosalynsantael", li: "rosalynse",         category: "Revenue Operations" },
  { name: "Camela Thompson",     x: "@camelathompson", li: "camelathompson",    category: "Revenue Operations" },
  { name: "Sangram Vajre",       x: "@sangramvajre",   li: "sangramvajre",      category: "Revenue Operations" },
  { name: "Matt Heinz",          x: "@HeinzMarketing", li: "mattheinz",         category: "Revenue Operations" },
  { name: "Chris Walker",        x: "@chriswalker171", li: "chriswalker171",    category: "Revenue Operations" },
  { name: "Jared Robin",         x: "@jaredrobin",     li: "jaredrobin",        category: "Revenue Operations" },
  { name: "Jeff Davis",          x: "@jefftdavis",     li: "jeffdavisrevenue",  category: "Revenue Operations" },
  { name: "Kyle Lacy",           x: "@kyleplacy",      li: "kyleplacy",         category: "Revenue Operations" },
  { name: "Udi Ledergor",        x: "@udiledergor",    li: "udiledergor",       category: "Revenue Operations" },
  { name: "Cliff Simon",         x: "@cliffsimon_gtm", li: "cliff-simon",       category: "Revenue Operations" },
];

// ─── Anthropic agentic loop ────────────────────────────────────────────────

async function runAgentLoop(apiKey, prompt) {
  // web_search is a server-side tool — Anthropic runs the searches inline and
  // returns results in the same response. We only loop on `pause_turn`, which
  // Anthropic emits when a long agentic run needs to be continued.
  const messages = [{ role: "user", content: prompt }];

  for (let turns = 0; turns < 5; turns++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    messages.push({ role: "assistant", content: data.content });

    if (data.stop_reason === "pause_turn") continue;

    return (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
  }

  throw new Error("Agent loop exceeded max turns.");
}

// ─── Brief generation ──────────────────────────────────────────────────────

async function generateBrief(env) {
  const today = new Date().toISOString().split("T")[0];
  const voiceList = VOICES.map((v, i) =>
    `${i + 1}. ${v.name} | X: ${v.x} | LinkedIn: /in/${v.li} | [${v.category}]`
  ).join("\n");

  const prompt = `You are an elite morning intelligence analyst. Today is ${today}.

Scan ALL 30 of these practitioners for fresh content published in the last 48 hours:

${voiceList}

SEARCH EACH PERSON across:
- X.com: search their handle for recent tweets and retweets
- LinkedIn: "[name] linkedin post ${today}"
- Substack / newsletter / blog
- YouTube: recent video titles and descriptions

AFTER searching all 30, select ONLY the TOP 5 most materially valuable pieces.

RANKING CRITERIA:
1. Novelty — new data, announcement, or genuine insight (not recycled takes)
2. Actionability — a business exec or operator can act on this today
3. Freshness — last 48h strongly preferred; 7 days absolute max
4. Specificity — numbers, real examples, concrete findings

Write each card for a business executive who has 10 seconds to decide if it's worth reading:
- 3 bullets max, tight, no fluff
- Include WHY it made the top 5 in one sentence

Return ONLY valid JSON. No markdown. No preamble:
{
  "date": "${today}",
  "generated_at": "${new Date().toISOString()}",
  "voices_scanned": 30,
  "top5": [
    {
      "rank": 1,
      "name": "Person Name",
      "category": "AI Practitioners|Salesforce / Agentforce|Revenue Operations",
      "platform": "X|LinkedIn|Substack|YouTube|Blog",
      "title": "Exact headline or video title",
      "pub_date": "May 17, 2026",
      "bullets": ["First bullet", "Second bullet", "Third bullet"],
      "url": "URL or null",
      "why_top5": "One sentence on why this ranked"
    }
  ]
}`;

  const raw = await runAgentLoop(env.ANTHROPIC_API_KEY, prompt);

  // Parse JSON — strip any markdown fences
  const stripped = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");

  const result = JSON.parse(match[0]);

  // Persist to KV — expire after 48 hours
  await env.BRIEF_KV.put("latest", JSON.stringify(result), {
    expirationTtl: 60 * 60 * 48,
  });

  console.log(`[Morning Brief] Generated ${result.top5?.length} items at ${result.generated_at}`);
  return result;
}

// ─── CORS headers ──────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// ─── Worker entry ──────────────────────────────────────────────────────────

export default {
  /**
   * HTTP handler — serves the brief API and a manual trigger endpoint
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // GET /api/morning-brief → return latest stored brief
    if (url.pathname === "/api/morning-brief" && request.method === "GET") {
      const data = await env.BRIEF_KV.get("latest", "json");
      if (!data) {
        return new Response(
          JSON.stringify({ status: "pending", message: "Brief not yet generated. Check back after 6 AM PST." }),
          { status: 202, headers: CORS }
        );
      }
      return new Response(JSON.stringify(data), { status: 200, headers: CORS });
    }

    // POST /api/trigger → manually kick off generation (useful for testing)
    if (url.pathname === "/api/trigger" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (!env.TRIGGER_SECRET || auth !== `Bearer ${env.TRIGGER_SECRET}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
      }
      ctx.waitUntil(generateBrief(env));
      return new Response(JSON.stringify({ status: "triggered", message: "Brief generation started." }), {
        status: 202,
        headers: CORS,
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS });
  },

  /**
   * Cron handler — fires at 6 AM PST daily
   * "0 13 * * *" = 6 AM PDT (UTC-7, Apr–Oct)
   * Change to "0 14 * * *" for PST (UTC-8, Nov–Mar)
   */
  async scheduled(event, env, ctx) {
    console.log(`[Morning Brief] Cron fired: ${new Date().toISOString()}`);
    ctx.waitUntil(generateBrief(env));
  },
};
