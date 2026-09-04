import { createSupabaseServer } from "./supabase/server";

/**
 * The video library behind /videos, /videos/[slug] and /videos/feed.
 *
 * One row per clip, one URL per clip. The scroll feed is a presentation layer
 * over these rows — it never holds content of its own — so every clip a visitor
 * can swipe to is also a plain page a crawler can fetch.
 */

export type VideoProvider = "cloudflare_stream" | "file" | "youtube";

export type VideoChapter = {
  title: string;
  start_seconds: number;
  end_seconds: number | null;
};

export type Video = {
  slug: string;
  title: string;
  description: string | null;
  transcript: string | null;
  provider: VideoProvider;
  playback_id: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  orientation: "vertical" | "horizontal";
  format: "short" | "long";
  topics: string[];
  post_slug: string | null;
  pinned: boolean;
  position: number;
  published_at: string | null;
  chapters?: VideoChapter[];
};

export const SITE_URL = "https://aventary.com";

/** Slugs that belong to real routes and can never name a clip. */
export const RESERVED_VIDEO_SLUGS = ["feed"];

// supabase-js infers row shapes from the *literal* select string, so these stay
// on one line each — concatenating or interpolating them widens the result to
// an untyped error union.
const SELECT =
  "slug,title,description,transcript,provider,playback_id,source_url,thumbnail_url,duration_seconds,orientation,format,topics,post_slug,pinned,position,published_at";
const SELECT_WITH_ID =
  "id,slug,title,description,transcript,provider,playback_id,source_url,thumbnail_url,duration_seconds,orientation,format,topics,post_slug,pinned,position,published_at";

/**
 * Cloudflare Stream serves every account from `customer-<code>.cloudflarestream.com`.
 * Set NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN to that hostname's first label.
 * Without it we fall back to videodelivery.net, which serves any UID but gives
 * up per-account analytics.
 */
function streamHost(): string {
  const sub = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN?.trim();
  return sub ? `https://${sub}.cloudflarestream.com` : "https://videodelivery.net";
}

/** The media URL a <video> element can load. Null when only an iframe exists. */
export function mediaUrl(v: Video): string | null {
  if (v.provider === "cloudflare_stream" && v.playback_id) {
    return `${streamHost()}/${v.playback_id}/manifest/video.m3u8`;
  }
  if (v.provider === "file") return v.source_url;
  return null; // youtube — iframe only
}

/** The player page URL, for VideoObject.embedUrl. */
export function embedUrl(v: Video): string | null {
  if (v.provider === "cloudflare_stream" && v.playback_id) {
    return `${streamHost()}/${v.playback_id}/iframe`;
  }
  if (v.provider === "youtube" && v.playback_id) {
    return `https://www.youtube.com/embed/${v.playback_id}`;
  }
  return null;
}

export function posterUrl(v: Video): string | null {
  if (v.thumbnail_url) return v.thumbnail_url;
  if (v.provider === "cloudflare_stream" && v.playback_id) {
    return `${streamHost()}/${v.playback_id}/thumbnails/thumbnail.jpg?time=1s&height=1200`;
  }
  if (v.provider === "youtube" && v.playback_id) {
    return `https://i.ytimg.com/vi/${v.playback_id}/maxresdefault.jpg`;
  }
  return null;
}

export function watchUrl(v: Pick<Video, "slug">): string {
  return `${SITE_URL}/videos/${v.slug}`;
}

/**
 * Whether a clip can autoplay inline as the feed scrolls. Browsers only grant
 * silent autoplay to a real <video> element we control; a YouTube iframe has to
 * be tapped, so those clips render as a poster with a play button instead.
 */
export function feedPlayable(v: Video): boolean {
  return mediaUrl(v) !== null;
}

/** Seconds → ISO 8601 duration ("PT1M23S"), the format schema.org expects. */
export function isoDuration(seconds: number | null | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s || (!h && !m) ? `${s}S` : ""}`;
}

/** Seconds → "1:23" / "1:02:03" for on-screen labels. */
export function clockDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Feed and grid order: pinned first, then manual position, then newest. */
function feedOrder(a: Video, b: Video): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.position !== b.position) return a.position - b.position;
  const at = a.published_at ? Date.parse(a.published_at) : 0;
  const bt = b.published_at ? Date.parse(b.published_at) : 0;
  return bt - at;
}

// ---------------------------------------------------------------------------
// Queries. Each falls back to SEED_VIDEOS when Supabase isn't configured, so
// `next dev` renders the real UI before the first migration — same contract as
// lib/seed.ts for pages.
// ---------------------------------------------------------------------------

export async function listVideos(): Promise<Video[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [...SEED_VIDEOS].sort(feedOrder);
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("videos")
      .select(SELECT)
      .not("published_at", "is", null)
      .order("pinned", { ascending: false })
      .order("position", { ascending: true })
      .order("published_at", { ascending: false });
    return (data ?? []) as Video[];
  } catch {
    return [];
  }
}

export async function getVideo(slug: string): Promise<Video | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return SEED_VIDEOS.find((v) => v.slug === slug) ?? null;
  }
  try {
    const supabase = await createSupabaseServer();
    const { data: video } = await supabase
      .from("videos")
      .select(SELECT_WITH_ID)
      .eq("slug", slug)
      .not("published_at", "is", null)
      .maybeSingle();
    if (!video) return null;
    const { data: chapters } = await supabase
      .from("video_chapters")
      .select("title,start_seconds,end_seconds")
      .eq("video_id", (video as { id: string }).id)
      .order("position", { ascending: true });
    return { ...(video as unknown as Video), chapters: (chapters ?? []) as VideoChapter[] };
  } catch {
    return null;
  }
}

/** Clips attached to an Insights post, for the in-article embed. */
export async function listVideosForPost(postSlug: string): Promise<Video[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return SEED_VIDEOS.filter((v) => v.post_slug === postSlug).sort(feedOrder);
  }
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("videos")
      .select(SELECT)
      .eq("post_slug", postSlug)
      .not("published_at", "is", null)
      .order("position", { ascending: true });
    return (data ?? []) as Video[];
  } catch {
    return [];
  }
}

/**
 * Everything standing between a published clip and a video result in Google,
 * in plain language for the admin screen.
 *
 * The thumbnail entry is the important one: Google treats thumbnailUrl as
 * required on both VideoObject and the video sitemap, so a clip without one is
 * dropped from *both* — silently, with no error anywhere. A `file` clip has no
 * thumbnail to derive, so it has to be supplied by hand.
 */
export function indexingGaps(video: Video): string[] {
  const gaps: string[] = [];
  if (!posterUrl(video)) {
    gaps.push(
      "No thumbnail. Google requires one — without it this clip is dropped from the video sitemap and from its own structured data. Set a thumbnail URL."
    );
  }
  if (!video.transcript?.trim()) {
    gaps.push(
      "No transcript. This is the only part of the clip a search engine or AI answer engine can read."
    );
  }
  if (!video.description?.trim()) {
    gaps.push("No description. Required in the video sitemap; falls back to the title.");
  }
  if (!video.duration_seconds) {
    gaps.push("No duration. Google uses it for the length badge on video results.");
  }
  if (video.provider === "youtube") {
    gaps.push(
      "YouTube-hosted: this page can be indexed, but Google usually credits the video itself to youtube.com. Upload the file to Stream to own it here."
    );
  }
  return gaps;
}

// ---------------------------------------------------------------------------
// Source resolution
// ---------------------------------------------------------------------------

export type VideoSourceFields = {
  provider: VideoProvider;
  playback_id: string | null;
  source_url: string | null;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id in any shape of YouTube link, or null if it isn't one. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!/^https?:\/\//i.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YOUTUBE_ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && YOUTUBE_ID.test(v)) return v;
    const match = /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/.exec(url.pathname);
    if (match) return match[1];
  }

  return null;
}

/**
 * Decide how a clip is played from whatever was pasted into the admin, rather
 * than trusting the Source dropdown.
 *
 * The dropdown defaults to Cloudflare Stream, so pasting a YouTube link or a
 * file URL without changing it stored a URL in `playback_id`, where a bare
 * Stream UID belongs. That produced a clip that saved cleanly, rendered a page,
 * and played nothing — the worst kind of failure, because it looks fine.
 *
 * A link says what it is, so it decides. Only a bare id is ambiguous (a Stream
 * UID and a YouTube id are both opaque tokens), and there the dropdown is a
 * deliberate choice, so it wins.
 */
export function resolveVideoSource(selected: string, referenceRaw: string): VideoSourceFields {
  const reference = referenceRaw.trim();

  const youtubeId = parseYouTubeId(reference);
  if (youtubeId) {
    return { provider: "youtube", playback_id: youtubeId, source_url: null };
  }

  if (/^https?:\/\//i.test(reference)) {
    return { provider: "file", playback_id: null, source_url: reference };
  }

  // Bare token: honour the dropdown. "file" without a URL is not playable, so
  // fall back to the Stream reading rather than storing something unusable.
  const provider: VideoProvider =
    selected === "youtube" ? "youtube" : "cloudflare_stream";
  return { provider, playback_id: reference || null, source_url: null };
}

// ---------------------------------------------------------------------------
// Chapter authoring
// ---------------------------------------------------------------------------

/**
 * Chapters are authored as one "0:00 Title" line each — the same shape people
 * already paste into YouTube descriptions — rather than as a row builder.
 *
 * `end_seconds` is derived, never typed: each chapter runs until the next one
 * starts, and the last runs to the end of the clip. schema.org Clip requires an
 * endOffset, and deriving it means the chapters can never overlap or leave gaps.
 */
export function parseChapters(input: string, durationSeconds: number | null): VideoChapter[] {
  const starts: { start_seconds: number; title: string }[] = [];

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.*\S)$/.exec(line);
    if (!match) continue;
    const [, h, m, sec, title] = match;
    const start = Number(h ?? 0) * 3600 + Number(m) * 60 + Number(sec);
    starts.push({ start_seconds: start, title });
  }

  starts.sort((a, b) => a.start_seconds - b.start_seconds);

  return starts.map((c, i) => {
    const nextStart = starts[i + 1]?.start_seconds ?? null;
    const end = nextStart ?? (durationSeconds && durationSeconds > c.start_seconds ? durationSeconds : null);
    return { title: c.title, start_seconds: c.start_seconds, end_seconds: end };
  });
}

/** The inverse, for re-populating the admin textarea. */
export function formatChapters(chapters: VideoChapter[]): string {
  return chapters
    .map((c) => {
      const h = Math.floor(c.start_seconds / 3600);
      const m = Math.floor((c.start_seconds % 3600) / 60);
      const s = c.start_seconds % 60;
      const mm = h ? String(m).padStart(2, "0") : String(m);
      return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")} ${c.title}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

/**
 * VideoObject for a watch page. `transcript` is included deliberately: it is the
 * only part of a video an answer engine can actually read, so it goes in the
 * markup as well as in the visible HTML.
 */
export function videoObjectJsonLd(v: Video): Record<string, unknown> {
  const url = watchUrl(v);
  const poster = posterUrl(v);
  const content = mediaUrl(v);
  const embed = embedUrl(v);

  const chapters = (v.chapters ?? []).filter((c) => c.end_seconds != null);

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title,
    description: v.description ?? v.title,
    thumbnailUrl: poster ? [poster] : undefined,
    uploadDate: v.published_at ?? undefined,
    duration: isoDuration(v.duration_seconds),
    contentUrl: content ?? undefined,
    embedUrl: embed ?? undefined,
    url,
    transcript: v.transcript ?? undefined,
    keywords: v.topics.length ? v.topics.join(", ") : undefined,
    isFamilyFriendly: true,
    publisher: {
      "@type": "Organization",
      name: "Aventary",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` }
    },
    hasPart: chapters.length
      ? chapters.map((c) => ({
          "@type": "Clip",
          name: c.title,
          startOffset: c.start_seconds,
          endOffset: c.end_seconds,
          url: `${url}?t=${c.start_seconds}`
        }))
      : undefined
  };
}

/** ItemList for /videos, so the index reads as a gallery rather than a wall. */
export function videoListJsonLd(videos: Video[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Aventary video library",
    itemListElement: videos.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: watchUrl(v),
      name: v.title
    }))
  };
}

// ---------------------------------------------------------------------------
// Seed content — local dev only (see queries above).
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const SEED_BASE = {
  provider: "file" as const,
  playback_id: null,
  post_slug: null,
  pinned: false
};

export const SEED_VIDEOS: Video[] = [
  {
    ...SEED_BASE,
    slug: "the-two-hour-rule",
    thumbnail_url:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80&auto=format&fit=crop",
    title: "The two-hour rule for untouched leads",
    description:
      "Any inbound lead nobody has touched in two hours goes to a pooled queue. Why that single rule recovers more pipeline than most scoring rebuilds.",
    transcript:
      "Most teams don't have a lead problem, they have a routing problem. Here's the rule I put in place first: any lead that nobody has touched after two hours leaves its owner and goes to a pooled queue that anyone can work. You don't need a new scoring model to do this. You need a timestamp on first touch and one automation. In the audits we run, that single rule surfaces twenty to forty percent of inbound that was silently sitting in someone's queue.",
    source_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration_seconds: 47,
    orientation: "vertical",
    format: "short",
    topics: ["RevOps", "Lead routing"],
    position: 0,
    published_at: daysAgo(2)
  },
  {
    ...SEED_BASE,
    slug: "scoring-is-not-the-bottleneck",
    thumbnail_url:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80&auto=format&fit=crop",
    title: "Lead scoring is almost never the bottleneck",
    description:
      "Teams rebuild the scoring model when the real loss is upstream, in assignment and first-touch time.",
    transcript:
      "Every time a team tells me their lead scoring is broken, I ask for one number first: median time to first touch. If that number is measured in days, the scoring model is not your problem. You are ranking leads nobody is calling. Fix assignment, fix first touch, and then argue about scoring.",
    source_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration_seconds: 39,
    orientation: "vertical",
    format: "short",
    topics: ["RevOps", "Lead scoring"],
    position: 1,
    published_at: daysAgo(5)
  },
  {
    ...SEED_BASE,
    slug: "pipeline-review-walkthrough",
    thumbnail_url:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&auto=format&fit=crop",
    title: "A full pipeline review, start to finish",
    description:
      "The complete walkthrough of how we audit an inbound pipeline: where leads enter, where they stall, and what we change first.",
    transcript:
      "In this walkthrough I take a live inbound pipeline apart from the top. We start at the form, follow every lead through enrichment and assignment, and find the three places records go quiet. Then we rank the fixes by how much pipeline each one returns per hour of engineering time.",
    source_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    duration_seconds: 653,
    orientation: "horizontal",
    format: "long",
    topics: ["RevOps", "Pipeline diagnostics"],
    position: 2,
    published_at: daysAgo(9),
    chapters: [
      { title: "Where leads enter", start_seconds: 0, end_seconds: 120 },
      { title: "The three stall points", start_seconds: 120, end_seconds: 400 },
      { title: "Ranking the fixes", start_seconds: 400, end_seconds: 653 }
    ]
  }
];
