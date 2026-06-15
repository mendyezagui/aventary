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

// Roster overhaul (Jun 2026): all feeds below were fetched and verified 2026-06-09.
// Cut (no active machine-readable output): Joanna Stern, Clara Shih, Vanessa Grant,
// Josh Birk, Jennifer Lee, Ketan Karkhanis, David Liu, Rosalyn Santa Elena,
// Camela Thompson, Jeff Davis, Kyle Lacy.
// Fallback-only keeps (no feed exists; web_search only): Adam Evans, Jared Robin,
// Udi Ledergor, Cliff Simon.
const VOICES = [
  // AI Practitioners
  { name: "Ethan Mollick",       x: "@emollick",       li: "ethan-mollick",     category: "AI Practitioners",       substack: "https://www.oneusefulthing.org/feed", youtube_channel_id: null },
  { name: "Allie K. Miller",     x: "@alliekmiller",   li: "alliekmiller",      category: "AI Practitioners",       substack: null, youtube_channel_id: "UCTVXt1spq1Vm4K-SyhS5KAQ" }, // beehiiv newsletter has no RSS
  { name: "Paul Roetzer",        x: "@paulroetzer",    li: "paulroetzer",       category: "AI Practitioners",       substack: "https://www.marketingaiinstitute.com/blog/rss.xml", youtube_channel_id: null }, // podcast alt: feeds.megaphone.fm/marketingai
  { name: "Matt Wolfe",          x: "@mreflow",        li: "mattwolfe",         category: "AI Practitioners",       substack: null, youtube_channel_id: "UChpleBmo18P08aKCIgti38g" }, // blog stale since Dec 2025
  { name: "Kieran Flanagan",     x: "@searchbrat",     li: "kieranjflanagan",   category: "AI Practitioners",       substack: "https://kieranflanagan.substack.com/feed", youtube_channel_id: null },
  { name: "Nate Jones",          x: "@natebjones",     li: "natebjones",        category: "AI Practitioners",       substack: "https://natesnewsletter.substack.com/feed", youtube_channel_id: "UC0C-17n9iuUQPylguM1d-lQ" },
  { name: "Lenny Rachitsky",     x: "@lennysan",       li: "lennyrachitsky",    category: "AI Practitioners",       substack: "https://www.lennysnewsletter.com/feed", youtube_channel_id: "UC6t1O76G0jYXOAoYCm153dA" },
  { name: "Andrew Ng",           x: "@AndrewYNg",      li: "andrewyng",         category: "AI Practitioners",       substack: null, youtube_channel_id: "UCcIXc5mJsHVYTZR1maL5l9w" }, // The Batch RSS returns 500s
  { name: "Dave Kellogg",        x: "@kellblog",       li: "davekellogg",       category: "AI Practitioners",       substack: "https://kellblog.com/feed/", youtube_channel_id: null },
  { name: "Ben Tossell",         x: "@bentossell",     li: "bentossell",        category: "AI Practitioners",       substack: "https://www.bensbites.com/feed", youtube_channel_id: null }, // replaces Joanna Stern — AI-at-work for real businesses
  // Salesforce / Agentforce
  { name: "Salesforce Ben",      x: "@salesforceben",  li: "benmccarthy90",     category: "Salesforce / Agentforce", substack: "https://www.salesforceben.com/feed/", youtube_channel_id: "UCdPGwyD0FfM55pJIPgx1mkw" },
  { name: "Rakesh Gupta",        x: "@iamrakeshgupta", li: "iamrakeshgupta",    category: "Salesforce / Agentforce", substack: "https://automationchampion.com/feed/", youtube_channel_id: null },
  { name: "Adam Evans",          x: "@adamevans_sf",   li: "adamevans",         category: "Salesforce / Agentforce", substack: null, youtube_channel_id: null }, // no feed — web_search fallback only
  { name: "Mike Gerholdt",       x: "@MikeGerholdt",   li: "mikegerholdt",      category: "Salesforce / Agentforce", substack: "https://buttonclickadmin2.libsyn.com/rss", youtube_channel_id: "UCJZ40ShB_oLStzaYT4m9WWQ" }, // admin.salesforce.com/feed 403s scripts — use Libsyn
  { name: "Salesforce Developers", x: "@SalesforceDevs", li: "salesforce-developers", category: "Salesforce / Agentforce", substack: null, youtube_channel_id: "UCKORm8sxh3cheBpqs0akkhg" }, // first-party Agentforce/MCP/Data 360 signal
  { name: "UnofficialSF",        x: "@UnofficialSF",   li: "alexedelstein",     category: "Salesforce / Agentforce", substack: "https://unofficialsf.com/feed/", youtube_channel_id: null }, // Flow + AI automation craft
  { name: "SalesforceDevops.net", x: "@salesforcedevop", li: "vernonkeenan",    category: "Salesforce / Agentforce", substack: "https://salesforcedevops.net/index.php/feed/", youtube_channel_id: null }, // independent Salesforce AI strategy analysis
  { name: "Apex Hours",          x: "@ApexHours",      li: "apexhours",         category: "Salesforce / Agentforce", substack: null, youtube_channel_id: "UChTdRj6YfwqhR_WEFepkcJw" }, // blog RSS broken — YT only
  { name: "Salesforce Blogger",  x: "n/a",             li: "n/a",               category: "Salesforce / Agentforce", substack: "https://www.salesforceblogger.com/feed/", youtube_channel_id: null }, // hands-on Agentforce/Data 360 walkthroughs
  { name: "Gradient Works",      x: "@gradientworks",  li: "gradient-works",    category: "Salesforce / Agentforce", substack: "https://www.gradient.works/blog/rss.xml", youtube_channel_id: null }, // routing/territory — RevOps lens on Salesforce
  // Revenue Operations
  { name: "Sangram Vajre",       x: "@sangramvajre",   li: "sangramvajre",      category: "Revenue Operations",     substack: "https://becomingintentional.substack.com/feed", youtube_channel_id: null }, // GTMonday paused since Jan 2026
  { name: "Matt Heinz",          x: "@HeinzMarketing", li: "mattheinz",         category: "Revenue Operations",     substack: "https://www.heinzmarketing.com/feed/", youtube_channel_id: "UCe2q5H-cL9UxvxmbvzKKVeA" },
  { name: "Chris Walker",        x: "@chriswalker171", li: "chriswalker171",    category: "Revenue Operations",     substack: "https://anchor.fm/s/1caa9814/podcast/rss", youtube_channel_id: null }, // GTM Live podcast (ex-Revenue Vitals, now Passetto-hosted)
  { name: "Jared Robin",         x: "@jaredrobin",     li: "jaredrobin",        category: "Revenue Operations",     substack: null, youtube_channel_id: null }, // beehiiv, RSS off — fallback only
  { name: "Udi Ledergor",        x: "@udiledergor",    li: "udiledergor",       category: "Revenue Operations",     substack: null, youtube_channel_id: null }, // no feed — fallback only
  { name: "Cliff Simon",         x: "@cliffsimon_gtm", li: "cliff-simon",       category: "Revenue Operations",     substack: null, youtube_channel_id: null }, // no feed — fallback only
  // AI × RevOps tilt — added for Aventary's non-tech-ICP focus (Aug 2026)
  { name: "Adam Robinson",       x: "@adamrobinson",   li: "adamlrobinson",     category: "Revenue Operations",     substack: null, youtube_channel_id: "UCSHn0Px37BjzMqnZBmVWwcQ" }, // RB2B newsletter blocks RSS
  { name: "Jordan Crawford",     x: "@jcraw",          li: "jordancrawford",    category: "Revenue Operations",     substack: "https://edge.blueprintgtm.com/feed", youtube_channel_id: "UC9E-b8Fz7JyPKjlKQlSQZdA" },
  { name: "Kareem Amin",         x: "@kareemamin",     li: "kareemamin",        category: "Revenue Operations",     substack: "https://www.clay.com/blog/rss.xml", youtube_channel_id: null }, // company-wide Clay blog
  { name: "Megan Bowen",         x: "@meganbowen",     li: "meganbowen",        category: "Revenue Operations",     substack: "https://anchor.fm/s/79a37aa4/podcast/rss", youtube_channel_id: null }, // Stacking Growth podcast
  // Roster adds (Jun 2026) — replacing cut feed-less voices
  { name: "Eric Nowoslawski",    x: "n/a",             li: "outboundphd",       category: "Revenue Operations",     substack: null, youtube_channel_id: "UC6ef5yDFz7gm8rARwX3HaDw" }, // Clay/outbound GTM engineering
  { name: "Elena Verna",         x: "@elenaverna",     li: "elenaverna",        category: "Revenue Operations",     substack: "https://www.elenaverna.com/feed", youtube_channel_id: null }, // AI-native GTM org design
  { name: "Emily Kramer",        x: "@emilykramer",    li: "emilykramer",       category: "Revenue Operations",     substack: "https://newsletter.mkt1.co/feed", youtube_channel_id: null }, // MKT1 — AI-native marketing ops
  { name: "RevOps Lab",          x: "n/a",             li: "janiszech",         category: "Revenue Operations",     substack: "https://anchor.fm/s/ec172b58/podcast/rss", youtube_channel_id: null }, // Weflow podcast — pipeline/forecast craft
];

// ─── KV schema ─────────────────────────────────────────────────────────────
const KV_LATEST      = "latest";
const KV_LAST_RUN    = "last_run_at";
const KV_SHOWN_PFX   = "shown:";
const KV_RECENT_ITEMS = "recent_items_v1";
const SHOWN_TTL_S    = 60 * 60 * 24 * 14; // 14 days
const BRIEF_TTL_S    = 60 * 60 * 24 * 14; // keep last brief readable for 14 days (was 48h)
const RECENT_TTL_S   = 60 * 60 * 24 * 30; // 30 days — safety net for KV expiry
const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // exclude items surfaced in the last 14 days
const RECENT_CAP     = 200;                // hard cap on how many items we track
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

// Rolling history of items the LLM has surfaced in the last RECENT_WINDOW_MS.
// Stored as a JSON array of { name, title, url, surfaced_at } in KV. Read at
// prompt-build time so the LLM is told "don't re-pick these"; pruned on every
// successful brief.
async function getRecentItems(env) {
  try {
    const raw = await env.BRIEF_KV.get(KV_RECENT_ITEMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    return parsed.filter((it) => it && typeof it.surfaced_at === "number" && it.surfaced_at >= cutoff);
  } catch {
    return [];
  }
}

async function appendRecentItems(env, top5) {
  const now = Date.now();
  const cutoff = now - RECENT_WINDOW_MS;
  const existing = await getRecentItems(env);
  const additions = (top5 || [])
    .filter((it) => it && (it.title || it.url || it.name))
    .map((it) => ({
      name: it.name || "",
      title: it.title || "",
      url: it.url || "",
      surfaced_at: now,
    }));
  // Newest first, dedup by url||title, prune by age, cap by length
  const seen = new Set();
  const merged = [];
  for (const item of [...additions, ...existing]) {
    if (item.surfaced_at < cutoff) continue;
    const sig = (item.url || item.title || item.name).trim().toLowerCase();
    if (!sig || seen.has(sig)) continue;
    seen.add(sig);
    merged.push(item);
    if (merged.length >= RECENT_CAP) break;
  }
  await env.BRIEF_KV.put(KV_RECENT_ITEMS, JSON.stringify(merged), {
    expirationTtl: RECENT_TTL_S,
  });
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

  // Layer 3: pull the rolling 14-day list of items the LLM has already
  // surfaced so we can pass them into the prompt as a hard exclude list.
  // This catches web_search hits that bypass the RSS URL-hash dedup.
  const recentItems = await getRecentItems(env);

  const rssBlock = freshRss.length
    ? freshRss.map((c, i) =>
        `${i + 1}. [${c.platform}] ${c.name} (${c.category}) — "${c.title}" — ${c.published_at}\n   ${c.url}`
      ).join("\n")
    : "(no fresh RSS items)";

  const voiceList = VOICES.map((v, i) =>
    `${i + 1}. ${v.name} | X: ${v.x} | LinkedIn: /in/${v.li} | [${v.category}]`
  ).join("\n");

  const excludeBlock = recentItems.length
    ? recentItems
        .map((it, i) => {
          const dayAgo = Math.max(0, Math.round((Date.now() - it.surfaced_at) / 86400000));
          const when = dayAgo === 0 ? "today" : `${dayAgo}d ago`;
          return `${i + 1}. ${it.name || "?"} — "${(it.title || "").slice(0, 140)}" — ${it.url || "(no url)"} (surfaced ${when})`;
        })
        .join("\n")
    : "(none yet — fresh start)";

  const prompt = `You are an elite morning intelligence analyst. Today is ${today}.

PART A — Pre-fetched RSS candidates (Substack + YouTube, published since the last brief, already deduped against prior briefs):
${rssBlock}

PART B — Voices to search on X and LinkedIn (use web_search for items from the last 48 hours):
${voiceList}

PART C — DO NOT RE-SURFACE (these items appeared in a brief in the last 14 days; pick different content even if the same voice has fresh content — match by title, URL, OR substantively the same announcement/argument):
${excludeBlock}

AFTER collecting candidates from A and B, select the TOP 5 most materially valuable pieces overall.

RANKING CRITERIA:
1. Novelty — new data, announcement, or genuine insight (not recycled takes)
2. Actionability — a business exec or operator can act on this today
3. Freshness — last 48h strongly preferred; 7 days absolute max
4. Specificity — numbers, real examples, concrete findings
5. Coverage — top5 MUST include at least 1 item with category "Revenue Operations". This is a hard constraint, not a preference. If no fresh RevOps post exists in PART A or PART B for this window, surface the strongest available RevOps voice (any platform, lookback up to 7 days) and write bullets that frame why their current posture matters — never omit RevOps to make room for a 5th AI/Salesforce item.
6. ICP fit — Aventary's audience is non-tech companies deploying AI + RevOps systems. When two items have comparable merit on criteria 1–4, prefer the one where AI is being APPLIED to revenue operations (lead routing, sales agent deployment, outbound at scale, pipeline data alignment, marketing automation, RevOps tooling at non-tech operators) over pure AI research, model release coverage, or AI-tech-news. A practical AI×RevOps signal an operator can deploy this quarter ranks above a more headline-grabbing pure-AI story when both are otherwise equivalent.
7. One voice per brief — each of the 5 slots MUST be a different voice/source. Never select more than one item from the same person or publication in a single brief, even if they published several strong pieces; choose their single best and give the remaining slots to other voices.

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

  // Enforce one-voice-per-brief (belt-and-suspenders behind the prompt rule):
  // keep each voice's highest-ranked item, drop any later duplicates, renumber.
  if (Array.isArray(result.top5)) {
    const seenVoices = new Set();
    const before = result.top5.length;
    result.top5 = result.top5
      .filter((it) => {
        const key = (it && it.name ? String(it.name) : "").trim().toLowerCase();
        if (!key) return true;
        if (seenVoices.has(key)) return false;
        seenVoices.add(key);
        return true;
      })
      .map((it, i) => ({ ...it, rank: i + 1 }));
    if (result.top5.length < before) {
      console.log(`[Morning Brief] one-voice-per-brief: dropped ${before - result.top5.length} duplicate-voice item(s)`);
    }
  }

  // Coverage safety check — flag (but don't block) briefs missing RevOps.
  // The prompt enforces a hard constraint that top5 must include a Revenue
  // Operations item; this log surfaces any time the model violates it so we
  // can tighten the prompt if it ever drifts.
  const hasRevOps = Array.isArray(result.top5) && result.top5.some(
    (i) => i && i.category === "Revenue Operations"
  );
  if (!hasRevOps) {
    console.warn(
      "[Morning Brief] WARNING: top5 missing Revenue Operations category — prompt coverage rule violated."
    );
  }

  // Persist brief
  await env.BRIEF_KV.put(KV_LATEST, JSON.stringify(result), { expirationTtl: BRIEF_TTL_S });

  // Mark surfaced URLs as shown so future runs skip them
  const urls = (result.top5 || []).map(i => i.url).filter(Boolean);
  if (urls.length) await markShown(env, urls);

  // Append to the rolling 14-day exclude list (catches web_search items the
  // URL-hash dedup misses because they bypass the RSS pre-filter)
  try {
    await appendRecentItems(env, result.top5 || []);
  } catch (e) {
    console.error("[Morning Brief] appendRecentItems failed:", e?.message || e);
  }

  // Only advance last_run_at after a successful brief — a failed run is safe to retry
  await env.BRIEF_KV.put(KV_LAST_RUN, new Date(now).toISOString());

  console.log(`[Morning Brief] top5=${result.top5?.length} rss=${freshRss.length} since=${new Date(sinceMs).toISOString()}`);

  // Post the brief as an Insights post + email the subscriber list. Both run
  // best-effort: failures are logged but never kill the cron run, because the
  // brief itself is already safely in KV at this point.
  try {
    await publishToInsights(env, result);
  } catch (e) {
    console.error("[Morning Brief] publishToInsights failed:", e?.message || e);
  }

  try {
    await emailSubscribers(env, result);
  } catch (e) {
    console.error("[Morning Brief] emailSubscribers failed:", e?.message || e);
  }

  return result;
}

// ─── Insights post ─────────────────────────────────────────────────────────

async function publishToInsights(env, brief) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[Morning Brief] Skipping Insights post — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.");
    return;
  }
  const top5 = brief.top5 || [];
  if (!top5.length) return;

  const date = brief.date;                                    // YYYY-MM-DD
  const slug = `morning-brief-${date}`;
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const title = `Morning Brief — ${dateLabel}`;
  const featured = top5[0] || {};
  const excerpt = `Top signal: ${featured.name || "—"} — ${featured.title || ""}`.slice(0, 240);

  const body_md = buildBriefMarkdown(brief, dateLabel);

  const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/posts?on_conflict=slug`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      slug, title, excerpt, body_md,
      published_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase posts upsert ${res.status}: ${text}`);
  }
  console.log(`[Morning Brief] Insights post written: /insights/${slug}`);
}

function buildBriefMarkdown(brief, dateLabel) {
  const top5 = brief.top5 || [];
  const lines = [];
  lines.push(
    `*Updated 6 AM PT · ${dateLabel} · ${brief.voices_scanned ?? 30} voices scanned · Top 5 surfaced*`
  );
  lines.push("");
  for (const item of top5) {
    lines.push(`## ${item.rank}. ${item.name}`);
    lines.push("");
    lines.push(`*${item.category}${item.platform ? ` · ${item.platform}` : ""}${item.pub_date ? ` · ${item.pub_date}` : ""}*`);
    lines.push("");
    if (item.title) {
      lines.push(`**${item.title}**`);
      lines.push("");
    }
    if (Array.isArray(item.bullets)) {
      for (const b of item.bullets) lines.push(`- ${b}`);
      lines.push("");
    }
    if (item.why_top5) {
      lines.push(`> **Why this matters:** ${item.why_top5}`);
      lines.push("");
    }
    if (item.url) {
      lines.push(`[View source ↗](${item.url})`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }
  lines.push(
    `*Generated by the Aventary intelligence agent. [Subscribe to the daily brief](/intelligence#mb-subscribe) to get this in your inbox at 6 AM PT.*`
  );
  return lines.join("\n");
}

// ─── Resend email ──────────────────────────────────────────────────────────

async function emailSubscribers(env, brief) {
  if (!env.RESEND_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[Morning Brief] Skipping subscriber email — missing RESEND_API_KEY or Supabase credentials.");
    return;
  }
  const fromEmail = env.FROM_EMAIL || "mendy@aventary.com";

  // Fetch active subscribers
  const subsUrl = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/intelligence_subscribers?status=eq.active&select=email,unsubscribe_token`;
  const subsRes = await fetch(subsUrl, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!subsRes.ok) {
    throw new Error(`Subscribers fetch ${subsRes.status}: ${await subsRes.text()}`);
  }
  const subscribers = await subsRes.json();
  if (!subscribers.length) {
    console.log("[Morning Brief] No active subscribers — skipping send.");
    return;
  }

  const date = brief.date;
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const subject = `Morning Brief — ${dateLabel}`;
  const baseHtml = buildBriefEmailHtml(brief, dateLabel);
  const baseText = buildBriefEmailText(brief, dateLabel);

  let sent = 0;
  let failed = 0;
  let sentEmails = [];

  for (const sub of subscribers) {
    const unsubUrl = `https://aventary.com/api/intelligence/unsubscribe?token=${sub.unsubscribe_token}`;
    const html = baseHtml.replace(/{{UNSUBSCRIBE_URL}}/g, unsubUrl);
    const text = baseText.replace(/{{UNSUBSCRIBE_URL}}/g, unsubUrl);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `Aventary Morning Brief <${fromEmail}>`,
          to: sub.email,
          subject,
          html,
          text,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[Morning Brief] Resend ${res.status} for ${sub.email}: ${body}`);
        failed++;
        continue;
      }
      sent++;
      sentEmails.push(sub.email);
    } catch (e) {
      console.warn(`[Morning Brief] Send failed for ${sub.email}: ${e?.message || e}`);
      failed++;
    }
  }

  // Stamp last_sent_at on successfully sent rows
  if (sentEmails.length) {
    const inList = sentEmails.map((e) => `"${e.replace(/"/g, '\\"')}"`).join(",");
    const stampUrl = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/intelligence_subscribers?email=in.(${encodeURIComponent(inList)})`;
    await fetch(stampUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ last_sent_at: new Date().toISOString() }),
    }).catch((e) => console.warn("[Morning Brief] last_sent_at stamp failed:", e?.message || e));
  }

  console.log(`[Morning Brief] Email sent=${sent} failed=${failed} subs=${subscribers.length}`);
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBriefEmailHtml(brief, dateLabel) {
  const top5 = brief.top5 || [];
  const initials = (n) =>
    String(n || "")
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const cards = top5
    .map((item, i) => {
      const isFeatured = i === 0;
      const bullets = Array.isArray(item.bullets) ? item.bullets : [];
      const bulletsHtml = bullets
        .map(
          (b) => `<li style="margin:0 0 6px;padding:0;line-height:20px;color:#4a4455;font-size:14px;">${esc(b)}</li>`
        )
        .join("");

      return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border:1px solid #ccc3d7;border-radius:4px;margin-bottom:16px;">
  <tr>
    <td style="padding:${isFeatured ? "24px" : "20px"};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom:14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:40px;height:40px;background:#ebddff;color:#5300b7;font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;border-radius:4px;text-align:center;vertical-align:middle;letter-spacing:0.04em;">${esc(initials(item.name))}</td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <div style="font-family:'Hanken Grotesk',Arial,sans-serif;font-size:18px;font-weight:600;line-height:24px;color:#0b1c30;">${esc(item.name)} <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#7b7486;">#${item.rank}</span></div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#5300b7;letter-spacing:0.02em;margin-top:2px;">${esc(item.category)}${item.platform ? ` · ${esc(item.platform)}` : ""}${item.pub_date ? ` · ${esc(item.pub_date)}` : ""}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          item.title
            ? `<tr>
          <td style="border-left:2px solid #5300b7;padding:0 0 0 14px;margin-bottom:16px;">
            <div style="font-family:'Hanken Grotesk',Arial,sans-serif;font-size:16px;line-height:24px;color:#0b1c30;font-weight:500;">${esc(item.title)}</div>
          </td>
        </tr>
        <tr><td style="height:14px;"></td></tr>`
            : ""
        }
        ${
          bullets.length
            ? `<tr>
          <td>
            <ul style="margin:0 0 12px;padding-left:18px;">${bulletsHtml}</ul>
          </td>
        </tr>`
            : ""
        }
        ${
          item.why_top5
            ? `<tr>
          <td style="padding-top:14px;border-top:1px solid #ccc3d7;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:#4a4455;margin-bottom:6px;">Why this matters</div>
            <div style="font-family:'Hanken Grotesk',Arial,sans-serif;font-size:13px;line-height:18px;color:#4a4455;">${esc(item.why_top5)}</div>
          </td>
        </tr>`
            : ""
        }
        ${
          item.url
            ? `<tr>
          <td style="padding-top:14px;">
            <a href="${esc(item.url)}" style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#5300b7;text-decoration:none;">View source ↗</a>
          </td>
        </tr>`
            : ""
        }
      </table>
    </td>
  </tr>
</table>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Morning Intelligence Brief</title>
</head>
<body style="margin:0;padding:0;background:#f8f9ff;font-family:'Hanken Grotesk',Arial,sans-serif;color:#0b1c30;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9ff;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;padding:32px 24px;">
          <tr>
            <td style="padding-bottom:20px;border-bottom:1px solid #ccc3d7;margin-bottom:24px;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#4a4455;letter-spacing:0.02em;margin-bottom:8px;"><span style="background:#ba1a1a;color:#ffffff;padding:3px 8px;border-radius:2px;font-weight:600;letter-spacing:0.08em;">LIVE</span> &nbsp; ${esc(String(brief.voices_scanned ?? 30))} voices scanned · Top 5 surfaced</div>
              <h1 style="font-family:'Hanken Grotesk',Arial,sans-serif;font-size:28px;line-height:36px;font-weight:700;letter-spacing:-0.02em;color:#0b1c30;margin:0;">Morning Intelligence Brief</h1>
              <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#4a4455;margin-top:6px;letter-spacing:0.02em;">Updated 6 AM PT · ${esc(dateLabel)}</div>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td>${cards}</td>
          </tr>
          <tr>
            <td style="padding-top:8px;text-align:center;">
              <a href="https://aventary.com/intelligence" style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#5300b7;text-decoration:none;">Read on aventary.com ↗</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;border-top:1px solid #ccc3d7;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:#4a4455;letter-spacing:0.02em;line-height:18px;">
              You're subscribed to the Aventary Morning Brief.<br />
              <a href="{{UNSUBSCRIBE_URL}}" style="color:#5300b7;text-decoration:underline;">Unsubscribe</a> any time.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildBriefEmailText(brief, dateLabel) {
  const top5 = brief.top5 || [];
  const lines = [];
  lines.push(`MORNING INTELLIGENCE BRIEF — ${dateLabel}`);
  lines.push(`${brief.voices_scanned ?? 30} voices scanned · Top 5 surfaced`);
  lines.push("");
  for (const item of top5) {
    lines.push(`#${item.rank} ${item.name} — ${item.category}`);
    if (item.title) lines.push(item.title);
    if (Array.isArray(item.bullets)) for (const b of item.bullets) lines.push(`  • ${b}`);
    if (item.why_top5) lines.push(`Why this matters: ${item.why_top5}`);
    if (item.url) lines.push(item.url);
    lines.push("");
  }
  lines.push("Read on the web: https://aventary.com/intelligence");
  lines.push("");
  lines.push("Unsubscribe: {{UNSUBSCRIBE_URL}}");
  return lines.join("\n");
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

      // Await generation so it completes within the request lifetime.
      // ctx.waitUntil() was getting cancelled when generation ran longer than
      // the post-response budget (generation takes ~100s), so briefs silently
      // never persisted.
      try {
        await generateBrief(env);
      } catch (e) {
        console.error("[Morning Brief] trigger generateBrief failed:", e?.message || e);
        return new Response(
          JSON.stringify({ status: "error", message: String(e?.message || e) }),
          { status: 500, headers: CORS }
        );
      }
      return new Response(JSON.stringify({ status: "completed", message: "Brief generation finished." }), {
        status: 200,
        headers: CORS,
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS });
  },

  async scheduled(event, env, ctx) {
    console.log(`[Morning Brief] Cron fired: ${new Date().toISOString()}`);
    // Await (not waitUntil) so the scheduled invocation stays alive for the
    // full ~100s web_search generation; rethrow so failures surface in Cron events.
    try {
      await generateBrief(env);
    } catch (e) {
      console.error("[Morning Brief] cron generateBrief failed:", e?.message || e);
      throw e;
    }
  },
};
