import type { MetadataRoute } from "next";

/**
 * Search engines are welcome; AI training crawlers are welcome to the marketing
 * pages only.
 *
 * `/tehillim` (a Psalms reader) and `/modeh` (the morning blessings) are
 * personal apps that happen to be hosted here. Both already serve `noindex` so
 * they stay out of search, but a `noindex` meta tag is an instruction about
 * *indexing* — training crawlers fetch pages without necessarily honouring it.
 * Disallowing the path is the part they do respect.
 *
 * Googlebot is deliberately NOT disallowed from either. A disallowed page
 * is never fetched, so its `noindex` is never read, and a URL somebody links to
 * can still surface as a bare result. Letting Google read the page is what
 * actually keeps it out.
 */

// Crawlers that gather text for model training or AI answers. Several ignore a
// bare `*`, so each is named.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "Diffbot",
  "Omgilibot",
];

const PRIVATE_PATHS = ["/tehillim", "/modeh", "/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everything else on the site stays open, which is the point of having
      // it. Only the private corners are closed.
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: "https://aventary.com/sitemap.xml",
  };
}
