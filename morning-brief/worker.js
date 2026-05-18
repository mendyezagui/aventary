/**
 * Morning Brief Worker — aventary.com
 * Runs daily at 6 AM PST via Cloudflare Cron Trigger
 *
 * Pipeline:
 *   1. Fetch RSS (Substack + YouTube) for voices that have those configured
 *   2. Filter to items published since the last successful run (with 6h overlap)
 *   3. Drop items already surfaced in a prior brief (KV "shown:" set)
 *   4. Pass survivors + voice list to Claude + web_search for X/LinkedIn scan
 *   5. Model ranks and returns top 5; persist brief + shown-set + last_run_at
 *
 * VOICES schema:
 *   substack:           full feed URL ("https://example.substack.com/feed") or null
 *   youtube_channel_id: 22-char UC... ID or null
 *   x / li:             handle for web search fallback
 *
 * To populate RSS feeds:
 *   Substack — append /feed to the publication URL (also works for Ghost/WP)
 *   YouTube  — on channel page, view source and grep for "channelId"
 *
 * Examples (verify before pasting):
 *   Ethan Mollick   substack: "https://www.oneusefulthing.org/feed"
 *   Lenny Rachitsky substack: "https://www.lennysnewsletter.com/feed"
 *   Dave Kellogg    substack: "https://kellblog.com/feed"
 */

const VOICES = [
  // AI Practitioners
  { name: "Ethan Mollick",       x: "@emollick",       li: "ethan-mollick",     category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Allie K. Miller",     x: "@alliekmiller",   li: "alliekmiller",      category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Paul Roetzer",        x: "@paulroetzer",    li: "paulroetzer",       category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Matt Wolfe",          x: "@mreflow",        li: "mattwolfe",         category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Kieran Flanagan",     x: "@searchbrat",     li: "kieranjflanagan",   category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Nate Jones",          x: "@natebjones",     li: "natebjones",        category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Lenny Rachitsky",     x: "@lennysan",       li: "lennyrachitsky",    category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Andrew Ng",           x: "@AndrewYNg",      li: "andrewyng",         category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Dave Kellogg",        x: "@kellblog",       li: "davekellogg",       category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  { name: "Joanna Stern",        x: "@JoannaStern",    li: "joannastern",       category: "AI Practitioners",       substack: null, youtube_channel_id: null },
  // Salesforce / Agentforce
  { name: "Salesforce Ben",      x: "@salesforceben",  li: "benmccarthy90",     category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Rakesh Gupta",        x: "@iamrakeshgupta", li: "iamrakeshgupta",    category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Clara Shih",          x: "@claraoshin",     li: "claraoshin",        category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Adam Evans",          x: "@adamevans_sf",   li: "adamevans",         category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Vanessa Grant",       x: "@vgrant411",      li: "vanessagrant411",   category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Mike Gerholdt",       x: "@MikeGerholdt",   li: "mikegerholdt",      category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Josh Birk",           x: "@joshbirk",       li: "joshbirk",          category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Jennifer Lee",        x: "@jenwlee",        li: "jenwlee",           category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "Ketan Karkhanis",     x: "@ketankarkh",     li: "ketankarkhanis",    category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  { name: "David Liu",           x: "@davidiholiu",    li: "davidliu",          category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null },
  // Revenue Operations
  { name: "Rosalyn Santa Elena", x: "@rosalynsantael", li: "rosalynse",         category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Camela Thompson",     x: "@camelathompson", li: "camelathompson",    category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Sangram Vajre",       x: "@sangramvajre",   li: "sangramvajre",      category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Matt Heinz",          x: "@HeinzMarketing", li: "mattheinz",         category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Chris Walker",        x: "@chriswalker171", li: "chriswalker171",    category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Jared Robin",         x: "@jaredrobin",     li: "jaredrobin",        category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Jeff Davis",          x: "@jefftdavis",     li: "jeffdavisrevenue",  category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Kyle Lacy",           x: "@kyleplacy",      li: "kyleplacy",         category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Udi Ledergor",        x: "@udiledergor",    li: "udiledergor",       category: "Revenue Operations",     substack: null, youtube_channel_id: null },
  { name: "Cliff Simon",         x: "@cliffsimon_gtm", li: "cliff-simon",       category: "Revenue Operations",     substack: null, youtube_channel_id: null },
];

// ─── KV schema ─────────────────────────────────────────────────────────────
const KV_LATEST      = "latest";
const KV_LAST_RUN    = "last_run_at";
const KV_SHOWN_PFX   = "shown:";
const SHOWN_TTL_S    = 60 * 60 * 24 * 14; // 14 days
const BRIEF_TTL_S    = 60 * 60 * 48;      // 48 hours
const RUN_OVERLAP_MS = 6  * 60 * 60 * 1000;
const MAX_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const WEB_SEARCH_MAX_USES = 30;

// ─── URL normalization & hashing ───────────────────────────────────────────

const TRACKING_PARAMS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","si","ref","ref_src","ref_url","mc_cid","mc_eid"];

function normalizeUrl(raw) {
  if (!raw) return "";
  try {
    const u = new URL(raw.trim());
    TRACKING_PARAMS.forEach(p => u.searchParams.delete(p));
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

async function sha1(s) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── RSS / Atom feed fetching ──────────────────────────────────────────────

async function fetchFeed(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "morning-brief-worker/1.0 (+aventary.com)" },
      cf: { cacheTtl: 1800 }, // 30 min edge cache — fine for this cadence
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Lightweight extractor — handles both RSS 2.0 (<item>) and Atom (<entry>).
// Avoids pulling in an XML parser; only the few fields we need are extracted.
function parseItems(xml, voice, source) {
  if (!xml) return [];
  const items = [];
  const tag = source === "youtube" ? "entry" : "item";
  const blockRe = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim();
    let link, published;
    if (source === "youtube") {
      link = block.match(/<link[^>]*href="([^"]+)"/)?.[1];
      published = block.match(/<published>([^<]+)<\/published>/)?.[1];
    } else {
      link = block.match(/<link>([^<]+)<\/link>/)?.[1]
          || block.match(/<link[^>]*href="([^"]+)"/)?.[1];
      published = block.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]
              || block.match(/<published>([^<]+)<\/published>/)?.[1]
              || block.match(/<updated>([^<]+)<\/updated>/)?.[1];
    }
    if (!title || !link || !published) continue;
    const pubMs = Date.parse(published);
    if (Number.isNaN(pubMs)) continue;
    items.push({
      name: voice.name,
      category: voice.category,
      platform: source === "youtube" ? "YouTube" : "Substack",
      title,
      url: normalizeUrl(link),
      published_at: new Date(pubMs).toISOString(),
    });
  }
  return items;
}

async function collectRssCandidates(sinceMs) {
  const tasks = [];
  for (const v of VOICES) {
    if (v.substack) {
      tasks.push((async () => parseItems(await fetchFeed(v.substack), v, "substack"))());
    }
    if (v.youtube_channel_id) {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${v.youtube_channel_id}`;
      tasks.push((async () => parseItems(await fetchFeed(url), v, "youtube"))());
    }
  }
  const results = await Promise.all(tasks);
  return results.flat().filter(i => Date.parse(i.published_at) >= sinceMs);
}

// ─── Dedup against prior briefs ────────────────────────────────────────────

async function filterUnseen(env, items) {
  const checks = await Promise.all(items.map(async (item) => {
    const key = KV_SHOWN_PFX + (await sha1(item.url));
    const seen = await env.BRIEF_KV.get(key);
    return seen ? null : item;
  }));
  return checks.filter(Boolean);
}

async function markShown(env, urls) {
  await Promise.all(urls.map(async (url) => {
    const key = KV_SHOWN_PFX + (await sha1(normalizeUrl(url)));
    await env.BRIEF_KV.put(key, "1", { expirationTtl: SHOWN_TTL_S });
  }));
}

// ─── Anthropic call ────────────────────────────────────────────────────────

async function runAgentLoop(apiKey, prompt) {
  // web_search is server-side: Anthropic runs searches inline and returns
  // results in the same response. We only loop on `pause_turn`, which marks
  // a long agentic run that needs to be continued.
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
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: WEB_SEARCH_MAX_USES }],
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
  const now = Date.now();

  // Layer 1: time window since last successful run (with safety overlap)
  const lastRunIso = await env.BRIEF_KV.get(KV_LAST_RUN);
  const lastRunMs = lastRunIso ? Date.parse(lastRunIso) : (now - 48 * 60 * 60 * 1000);
  const sinceMs = Math.max(lastRunMs - RUN_OVERLAP_MS, now - MAX_LOOKBACK_MS);

  const rssCandidates = await collectRssCandidates(sinceMs);
  // Layer 2: drop items already surfaced in a prior brief
  const freshRss = await filterUnseen(env, rssCandidates);

  const rssBlock = freshRss.length
    ? freshRss.map((c, i) =>
        `${i + 1}. [${c.platform}] ${c.name} (${c.category}) — "${c.title}" — ${c.published_at}\n   ${c.url}`
      ).join("\n")
    : "(no fresh RSS items)";

  const voiceList = VOICES.map((v, i) =>
    `${i + 1}. ${v.name} | X: ${v.x} | LinkedIn: /in/${v.li} | [${v.category}]`
  ).join("\n");

  const prompt = `You are an elite morning intelligence analyst. Today is ${today}.

PART A — Pre-fetched RSS candidates (Substack + YouTube, published since the last brief, already deduped against prior briefs):
${rssBlock}

PART B — Voices to search on X and LinkedIn (use web_search for items from the last 48 hours):
${voiceList}

AFTER collecting candidates from A and B, select the TOP 5 most materially valuable pieces overall.

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
  "voices_scanned": ${VOICES.length},
  "rss_prefetched": ${freshRss.length},
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

  // Persist brief
  await env.BRIEF_KV.put(KV_LATEST, JSON.stringify(result), { expirationTtl: BRIEF_TTL_S });

  // Mark surfaced URLs as shown so future runs skip them
  const urls = (result.top5 || []).map(i => i.url).filter(Boolean);
  if (urls.length) await markShown(env, urls);

  // Only advance last_run_at after a successful brief — a failed run is safe to retry
  await env.BRIEF_KV.put(KV_LAST_RUN, new Date(now).toISOString());

  console.log(`[Morning Brief] top5=${result.top5?.length} rss=${freshRss.length} since=${new Date(sinceMs).toISOString()}`);
  return result;
}

// ─── CORS ──────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// ─── Worker entry ──────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // GET /api/morning-brief → latest stored brief
    if (url.pathname === "/api/morning-brief" && request.method === "GET") {
      const data = await env.BRIEF_KV.get(KV_LATEST, "json");
      if (!data) {
        return new Response(
          JSON.stringify({ status: "pending", message: "Brief not yet generated. Check back after 6 AM PST." }),
          { status: 202, headers: CORS }
        );
      }
      return new Response(JSON.stringify(data), { status: 200, headers: CORS });
    }

    // POST /api/trigger[?force=1] → manually kick off generation
    if (url.pathname === "/api/trigger" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (!env.TRIGGER_SECRET || auth !== `Bearer ${env.TRIGGER_SECRET}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
      }

      // Idempotency: refuse to spend money if today's brief already exists
      if (url.searchParams.get("force") !== "1") {
        const existing = await env.BRIEF_KV.get(KV_LATEST, "json");
        const today = new Date().toISOString().split("T")[0];
        if (existing?.date === today) {
          return new Response(
            JSON.stringify({
              status: "skipped",
              message: `Brief for ${today} already exists. Append ?force=1 to regenerate.`,
            }),
            { status: 409, headers: CORS }
          );
        }
      }

      ctx.waitUntil(generateBrief(env));
      return new Response(JSON.stringify({ status: "triggered", message: "Brief generation started." }), {
        status: 202,
        headers: CORS,
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS });
  },

  async scheduled(event, env, ctx) {
    console.log(`[Morning Brief] Cron fired: ${new Date().toISOString()}`);
    ctx.waitUntil(generateBrief(env));
  },
};
