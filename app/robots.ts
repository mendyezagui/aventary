import type { MetadataRoute } from "next";

/**
 * Search engines are welcome; AI training crawlers are welcome to the marketing
 * pages only.
 *
 * `/c/*` holds gated client documents with no business in search
 * at all, so it is disallowed for everyone including Google.
 *
 * `/see` is the internal project index and `/portal/*` is the sign-in
 * plumbing behind the customer login. Same treatment for the same reason: the
 * index names other people's clients, and a sign-in endpoint has nothing to
 * offer a crawler. `/c` itself — the login door — is deliberately NOT
 * disallowed, on the `/tehillim` reasoning below: it carries `noindex`, and a
 * page Google may fetch is a page whose `noindex` Google actually reads.
 * Disallowing `/c` would also be a trap, since a bare `Disallow: /c` matches
 * `/contact`, `/chart` and `/camp-letter` too.
 *
 * `/tehillim` is a personal Psalms reader that happens to be hosted here. It
 * already serves `noindex` so it stays out of search, but a `noindex` meta tag
 * is an instruction about *indexing* — training crawlers fetch pages without
 * necessarily honouring it. Disallowing the path is the part they do respect.
 *
 * Googlebot is deliberately NOT disallowed from `/tehillim`. A disallowed page
 * is never fetched, so its `noindex` is never read, and a URL somebody links to
 * can still surface as a bare result. Letting Google read the page is what
 * actually keeps it out.
 *
 * `/team` gets the `/tehillim` treatment for the same two reasons. The roster
 * and the profiles under it are unlisted, not secret: they carry `noindex`, they
 * are absent from the nav and the sitemap, and they exist to be sent to a
 * specific person. Google is left free to fetch them precisely so it reads that
 * `noindex`; the training crawlers are disallowed, because a `noindex` tag is an
 * instruction about indexing and says nothing about scraping a personal
 * biography into a corpus. Note that `/work` links to `/team/mendy`, so the page
 * is reachable by anyone who goes looking — if it needs to be genuinely private
 * rather than merely unlisted, it belongs behind the customer login at `/c`.
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

const PRIVATE_PATHS = ["/tehillim", "/team", "/c/", "/see", "/portal/", "/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everything else on the site stays open, which is the point of having
      // it. Only the private corners are closed.
      { userAgent: "*", allow: "/", disallow: ["/c/", "/see", "/portal/", "/admin", "/api/"] },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: ["https://aventary.com/sitemap.xml", "https://aventary.com/video-sitemap.xml"],
  };
}
