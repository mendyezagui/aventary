import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/cms";
import { listVideos } from "@/lib/videos";

// Regenerate at most once a day rather than per crawler hit, so the Supabase
// query behind listPosts() isn't re-run on every /sitemap.xml fetch.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Apex is the canonical host (middleware 301s www → apex). Emitting apex URLs
  // here means crawlers hit the real page directly instead of eating an extra
  // redirect invocation on every indexed URL.
  const base = "https://aventary.com";
  const statics = ["", "/about", "/contact", "/appointments", "/insights", "/videos", "/camp-letter"].map((p) => ({
    url: base + p,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7
  }));
  const [posts, videos] = await Promise.all([listPosts(), listVideos()]);
  const postUrls = posts.map((p: any) => ({
    url: `${base}/insights/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.5
  }));
  // Watch pages also appear in /video-sitemap.xml with the video: namespace.
  // Listing them here too is what gets them crawled as ordinary pages.
  const videoUrls = videos.map((v) => ({
    url: `${base}/videos/${v.slug}`,
    lastModified: v.published_at ? new Date(v.published_at) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.6
  }));
  return [...statics, ...postUrls, ...videoUrls];
}
