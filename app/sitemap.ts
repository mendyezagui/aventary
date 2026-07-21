import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/cms";

// Regenerate at most once a day rather than per crawler hit, so the Supabase
// query behind listPosts() isn't re-run on every /sitemap.xml fetch.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Apex is the canonical host (middleware 301s www → apex). Emitting apex URLs
  // here means crawlers hit the real page directly instead of eating an extra
  // redirect invocation on every indexed URL.
  const base = "https://aventary.com";
  const statics = ["", "/about", "/contact", "/appointments", "/insights", "/camp-letter"].map((p) => ({
    url: base + p,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7
  }));
  const posts = await listPosts();
  const postUrls = posts.map((p: any) => ({
    url: `${base}/insights/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.5
  }));
  return [...statics, ...postUrls];
}
