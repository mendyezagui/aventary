import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/cms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.aventary.com";
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
