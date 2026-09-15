import {
  anchorsOf,
  buildDocument,
  documentSource,
  type ClientDocument,
  type DocMeta,
  type RawBlock
} from "@/lib/client-doc";
import type { Anchor } from "@/lib/doc-anchors";

// Project pages: the document at /c/<slug> built from a Second Brain project's
// blocks, rather than from a file in this repo.
//
// Why it reads a second database. Content and access control belong in
// different places. A project's sections are edited all day in Client Hub, in
// the Second Brain product database, next to the tasks and the deal they
// describe. Who may READ the resulting page is this website's business, and
// lives here — in client_pages, with the tokens and sessions that enforce it.
// So this module reaches across to fetch content, and nothing else. Every
// access decision stays on this side.
//
// It reads through one purpose-built endpoint, project-page-feed, and holds a
// secret that can fetch published page content for one slug and nothing else.
// Deliberately not a service-role key: this is a public marketing site, and a
// key here that could read every tenant's CRM would be a blast radius out of
// all proportion to rendering a document.

// Read per call, not at module scope. On Workers the environment is bound to
// the request, so a module-level capture can be undefined for the life of the
// isolate and silently disable this whole path.
const sbEnv = () => ({
  url: process.env.SECOND_BRAIN_URL,
  secret: process.env.PAGE_FEED_SECRET
});

/**
 * True when this deploy can reach Second Brain at all. When false every lookup
 * here returns null and /c/<slug> falls through to the other content sources,
 * so an unconfigured deploy serves the old page rather than breaking.
 */
export function projectPagesConfigured() {
  const { url, secret } = sbEnv();
  return Boolean(url && secret);
}

export type ProjectBlock = RawBlock;

export type ProjectPage = {
  title: string;
  blurb: string;
  readers: string[];
  /**
   * The document itself, as structure rather than markup.
   *
   * This used to be an HTML string, built by a 4KB template function in this
   * file and rendered inside an auto-sized iframe. It is a tree now, rendered
   * by components/client-doc. The move is what bought collapsible sections, a
   * contents rail and a page that prints — none of which an iframe sized to
   * its own scrollHeight could ever have.
   */
  doc: ClientDocument;
  /** The document as text, with section markers, for the Ask panel's context. */
  text: string;
  /** Every place a citation may point, indexed from the document's own ids. */
  anchors: Anchor[];
};

type Feed = {
  name: string;
  client: string | null;
  meta: DocMeta;
  readers: string[];
  blocks: ProjectBlock[];
};

/**
 * Fetch one published page. Null for every failure — not configured, no such
 * published slug, a bad secret, Second Brain down — because from this side they
 * all mean the same thing: there is no project page here, fall through to the
 * next content source.
 */
async function fetchFeed(slug: string): Promise<Feed | null> {
  const { url, secret } = sbEnv();
  if (!url || !secret) return null;
  try {
    const res = await fetch(
      `${url}/functions/v1/project-page-feed?slug=${encodeURIComponent(slug)}`,
      { headers: { "x-page-secret": secret }, cache: "no-store" }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`project-page-feed ${slug} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as Feed;
  } catch (err) {
    console.error("project-page-feed threw", err);
    return null;
  }
}


export type ProjectPageListing = {
  slug: string;
  title: string;
  /** How many people are named in Client Hub. Zero means nobody can open it. */
  readerCount: number;
};

/**
 * Every published page's slug and title — the feed's list mode.
 *
 * This is what lets the website know a page EXISTS. Access rows over here are
 * provisioned lazily, on the first request for a slug, so without this a
 * project published in Client Hub and not yet opened by anybody was missing
 * from the staff index at /see and from its own client's shelf at /c: invisible
 * until somebody guessed the URL it had never been sent.
 *
 * Null, not [], when the feed cannot be reached — an index that cannot tell
 * "nothing is published" from "Second Brain is down" would quietly report an
 * empty desk as the truth. Callers fall back to what this repo's own table
 * knows, which is the behaviour that existed before this function.
 *
 * It returns no readers and no blocks. A list needs to know a page is there and
 * whether anyone can open it, not everyone's address.
 */
export async function listProjectPages(): Promise<ProjectPageListing[] | null> {
  const { url, secret } = sbEnv();
  if (!url || !secret) return null;
  try {
    const res = await fetch(`${url}/functions/v1/project-page-feed?list=1`, {
      headers: { "x-page-secret": secret },
      cache: "no-store"
    });
    if (!res.ok) {
      console.error(`project-page-feed list -> ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { pages?: ProjectPageListing[] };
    return (body.pages ?? [])
      .filter((p) => typeof p.slug === "string" && p.slug.trim())
      .map((p) => ({
        slug: p.slug.toLowerCase().trim(),
        title: (p.title || p.slug).trim(),
        readerCount: Number.isFinite(p.readerCount) ? Number(p.readerCount) : 0
      }));
  } catch (err) {
    console.error("project-page-feed list threw", err);
    return null;
  }
}

/**
 * Just the reader list and title for a published project, without building the
 * document. Sign-in checks need the allowlist on every attempt and have no use
 * for the document itself.
 */
export async function getProjectAccess(
  slug: string
): Promise<{ title: string; readers: string[] } | null> {
  const feed = await fetchFeed(slug);
  if (!feed) return null;
  const heading = typeof feed.meta?.heading === "string" ? feed.meta.heading.trim() : "";
  return { title: heading || feed.name, readers: normalize(feed.readers) };
}

const normalize = (list: string[] | null) =>
  (list ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);

/**
 * The published project behind a slug, or null.
 *
 * Null for every reason that is not "here is the page": not configured, no
 * project claims the slug, the project is not published, or it has no public
 * blocks. A published page with nothing public on it is not a page — serving an
 * empty document would look like a mistake to whoever opened it.
 */
export async function getProjectPage(slug: string): Promise<ProjectPage | null> {
  const feed = await fetchFeed(slug);
  if (!feed || !feed.blocks.length) return null;

  const doc = buildDocument({
    name: feed.name,
    client: feed.client,
    meta: feed.meta ?? {},
    blocks: feed.blocks
  });

  return {
    title: doc.title,
    blurb: doc.blurb,
    readers: normalize(feed.readers),
    doc,
    text: documentSource(doc),
    anchors: anchorsOf(doc)
  };
}
