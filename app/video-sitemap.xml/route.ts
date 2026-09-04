import {
  embedUrl,
  listVideos,
  mediaUrl,
  posterUrl,
  watchUrl,
  type Video
} from "@/lib/videos";

/**
 * A dedicated Google video sitemap.
 *
 * Hand-rolled rather than emitted from app/sitemap.ts: the `video:` namespace
 * has required children and per-field limits that a generic sitemap helper
 * doesn't express, and getting them wrong means the whole entry is dropped
 * silently rather than rejected loudly.
 *
 * Register it in Search Console alongside /sitemap.xml.
 */

export const revalidate = 86400;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function entry(video: Video): string | null {
  const thumbnail = posterUrl(video);
  const content = mediaUrl(video);
  const player = embedUrl(video);

  // Google drops any entry missing a thumbnail or any way to play the video.
  if (!thumbnail || (!content && !player)) return null;

  const parts: string[] = [
    `<video:thumbnail_loc>${escapeXml(thumbnail)}</video:thumbnail_loc>`,
    `<video:title>${escapeXml(truncate(video.title, 100))}</video:title>`,
    `<video:description>${escapeXml(
      truncate(video.description ?? video.title, 2048)
    )}</video:description>`
  ];

  if (content) parts.push(`<video:content_loc>${escapeXml(content)}</video:content_loc>`);
  if (player) {
    parts.push(
      `<video:player_loc allow_embed="yes">${escapeXml(player)}</video:player_loc>`
    );
  }

  // Google only accepts 1s–8h here; anything outside invalidates the entry.
  const duration = video.duration_seconds ?? 0;
  if (duration >= 1 && duration <= 28_800) {
    parts.push(`<video:duration>${duration}</video:duration>`);
  }

  if (video.published_at) {
    parts.push(
      `<video:publication_date>${escapeXml(video.published_at)}</video:publication_date>`
    );
  }

  parts.push("<video:family_friendly>yes</video:family_friendly>");
  for (const tag of video.topics.slice(0, 32)) {
    parts.push(`<video:tag>${escapeXml(tag)}</video:tag>`);
  }

  return [
    "  <url>",
    `    <loc>${escapeXml(watchUrl(video))}</loc>`,
    "    <video:video>",
    ...parts.map((p) => `      ${p}`),
    "    </video:video>",
    "  </url>"
  ].join("\n");
}

export async function GET(): Promise<Response> {
  const videos = await listVideos();
  const entries = videos.map(entry).filter((e): e is string => e !== null);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ...entries,
    "</urlset>"
  ].join("\n");

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400"
    }
  });
}
