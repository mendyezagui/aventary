import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  getPageRow,
  hashToken,
  normalizeEmail,
  randomToken,
  readersFor
} from "@/lib/client-pages";

// The customer login behind /c, and the project index at /see.
//
// lib/client-pages.ts answers "may this cookie read this one document?". This
// file answers the question above it: "who is this, and what may they see?" —
// which is what turns a pile of separately-gated URLs into somewhere a customer
// signs in once and finds their own things.
//
// The two layers are deliberately independent. A per-page session opened from a
// link already in someone's inbox, or from a page's shared password, keeps
// working untouched and knows nothing about this file. A portal session is the
// second way in, not a replacement, and /c/<slug> accepts either.
//
// Where they differ is identity. A shared-password session has none — the
// database records it as "(shared password)" because that is the truth — so it
// can only ever open the one document it was used on. It never reaches an index
// that would say what else exists.

export const PORTAL_COOKIE = "av_portal";
export const PORTAL_SESSION_DAYS = 30;
const TOKEN_MINUTES = 20;
const MAX_LINKS_PER_HOUR = 5;

export type Role = "owner" | "staff" | "client";

export type Viewer = {
  email: string;
  name: string | null;
  role: Role;
};

/** Staff and owner see everything; client sees what has been shared with them. */
export function seesEverything(viewer: Viewer) {
  return viewer.role === "owner" || viewer.role === "staff";
}

export type PageSummary = {
  slug: string;
  title: string;
  clientName: string | null;
  summary: string | null;
  createdAt: string;
};

/**
 * True when the server can check access at all. Without it every lookup below
 * returns nothing, so a misconfigured deploy shows an empty, closed portal
 * rather than crashing or — far worse — falling open.
 */
function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Every read here is wrapped, because the failure that matters is the one where
 * the tables are not there yet — a deploy that lands before its migration does.
 * That must read as "nobody may see anything", never as a 500 and never as a
 * missing check.
 */
async function safely<T>(what: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`portal: ${what} failed`, err);
    return fallback;
  }
}

/**
 * Who this address is.
 *
 * No row means "client": access comes from the allowlists on the pages shared
 * with them, which is where it has always lived. A row with active=false is a
 * block and returns null — it beats every allowlist rather than sitting next to
 * one, so revoking somebody is a single write instead of an audit of every page.
 */
export async function resolveViewer(rawEmail: string): Promise<Viewer | null> {
  const email = normalizeEmail(rawEmail);
  if (!email || !configured()) return null;

  return safely(
    "resolveViewer",
    async () => {
      const { data } = await createSupabaseAdmin()
        .from("portal_people")
        .select("email,name,role,active")
        .eq("email", email)
        .maybeSingle();

      if (data && data.active === false) return null;
      if (!data) return { email, name: null, role: "client" as Role };
      return {
        email,
        name: (data.name as string | null) ?? null,
        role: (data.role as Role) ?? "client"
      };
    },
    null
  );
}

/**
 * Whether this address may be sent a sign-in link at all: known to
 * portal_people, or on the allowlist of at least one live page.
 *
 * Callers must not let the answer change what the visitor sees. Whether an
 * address is a customer of ours is exactly the kind of thing a stranger should
 * not be able to test for with a form.
 */
export async function isKnownAddress(email: string): Promise<boolean> {
  if (!configured()) return false;

  return safely(
    "isKnownAddress",
    async () => {
      const db = createSupabaseAdmin();
      const { data: person } = await db
        .from("portal_people")
        .select("email,active")
        .eq("email", email)
        .maybeSingle();
      if (person) return person.active !== false;

      // Not a .contains() on allowed_emails: a project page leaves that column
      // empty on purpose and keeps its readers in Client Hub, so the cheap
      // query would refuse a link to exactly the people we publish for now.
      const { data } = await db.from("client_pages").select("slug").eq("active", true);
      const slugs = (data ?? []).map((r) => r.slug as string);
      const hits = await Promise.all(slugs.map((slug) => mayRead(slug, email)));
      return hits.some(Boolean);
    },
    false
  );
}

/**
 * Whether one address may read one page — the single place this is decided.
 *
 * It defers to readersFor(), which unions the website's own allowlist with the
 * reader list on the published Second Brain project. Asking client_pages
 * directly would look right and quietly exclude every project-page reader,
 * because a row provisioned for a project page is written with allowed_emails
 * empty and its readers live in Client Hub.
 *
 * getPageRow() also provisions that row on first sight, so a page published in
 * Client Hub and never yet visited still answers correctly here.
 */
async function mayRead(slug: string, email: string): Promise<boolean> {
  return safely(
    "mayRead",
    async () => {
      const page = await getPageRow(slug);
      if (!page || page.active !== true) return false;
      return (await readersFor(slug, page)).includes(email);
    },
    false
  );
}

/**
 * Issues a portal sign-in link, or null for an address we do not know, one that
 * is blocked, or one that has asked five times in an hour. The caller shows the
 * same message in all four cases.
 */
export async function issuePortalLink(
  rawEmail: string,
  redirectTo: string | null
): Promise<string | null> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@") || !configured()) return null;
  if (!(await isKnownAddress(email))) return null;

  return safely(
    "issuePortalLink",
    async () => {
      const db = createSupabaseAdmin();
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await db
        .from("portal_tokens")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", since);
      if ((count ?? 0) >= MAX_LINKS_PER_HOUR) return null;

      const token = randomToken();
      const { error } = await db.from("portal_tokens").insert({
        email,
        token_hash: await hashToken(token),
        redirect_to: safeRedirect(redirectTo),
        expires_at: new Date(Date.now() + TOKEN_MINUTES * 60 * 1000).toISOString()
      });
      return error ? null : token;
    },
    null
  );
}

/**
 * A place on this site we are willing to send somebody after they sign in.
 *
 * Only /c and /see, only site-relative, and protocol-relative "//evil.com" is
 * rejected explicitly — it is a valid URL to a browser and the one that turns a
 * redirect parameter into a phishing link with a fresh session attached.
 */
export function safeRedirect(raw: string | null | undefined): string {
  const fallback = "/c";
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  const path = raw.split(/[?#]/)[0];
  if (path === "/see" || path === "/c" || /^\/c\/[A-Za-z0-9][A-Za-z0-9_-]*$/.test(path)) {
    return path;
  }
  return fallback;
}

/** Redeems a link once and opens a session. */
export async function redeemPortalToken(
  token: string
): Promise<{ session: string; redirectTo: string } | null> {
  if (!token || !configured()) return null;

  return safely(
    "redeemPortalToken",
    async () => {
      const db = createSupabaseAdmin();
      const { data: row } = await db
        .from("portal_tokens")
        .select("id,email,redirect_to,expires_at,used_at")
        .eq("token_hash", await hashToken(token))
        .maybeSingle();

      if (!row || row.used_at) return null;
      if (new Date(row.expires_at as string).getTime() < Date.now()) return null;

      // A blocked address must not be able to spend a link issued before the
      // block. Re-check the person now, not only when the link was made.
      const viewer = await resolveViewer(row.email as string);
      if (!viewer) return null;

      // Mark used before opening the session: if two clicks race, one wins.
      const { data: claimed } = await db
        .from("portal_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", row.id)
        .is("used_at", null)
        .select("id")
        .maybeSingle();
      if (!claimed) return null;

      const session = randomToken();
      const { error } = await db.from("portal_sessions").insert({
        email: viewer.email,
        session_hash: await hashToken(session),
        expires_at: new Date(Date.now() + PORTAL_SESSION_DAYS * 86400 * 1000).toISOString()
      });
      if (error) return null;

      return { session, redirectTo: safeRedirect(row.redirect_to as string | null) };
    },
    null
  );
}

/**
 * The signed-in viewer, or null. Also refreshes last_seen_at.
 *
 * The role is re-read on every request rather than baked into the cookie, so
 * blocking someone or changing what they are takes effect on their next page
 * load instead of whenever their session happens to expire.
 */
export async function readPortalSession(cookie: string | undefined): Promise<Viewer | null> {
  if (!cookie || !configured()) return null;

  return safely(
    "readPortalSession",
    async () => {
      const db = createSupabaseAdmin();
      const { data } = await db
        .from("portal_sessions")
        .select("id,email,expires_at")
        .eq("session_hash", await hashToken(cookie))
        .maybeSingle();

      if (!data) return null;
      if (new Date(data.expires_at as string).getTime() < Date.now()) return null;

      const viewer = await resolveViewer(data.email as string);
      if (!viewer) return null;

      await db
        .from("portal_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", data.id);
      return viewer;
    },
    null
  );
}

/** Ends one session. Signing out on one device leaves the others alone. */
export async function closePortalSession(cookie: string | undefined) {
  if (!cookie || !configured()) return;
  await safely(
    "closePortalSession",
    async () => {
      await createSupabaseAdmin()
        .from("portal_sessions")
        .delete()
        .eq("session_hash", await hashToken(cookie));
      return null;
    },
    null
  );
}

/**
 * Every active page this viewer may open.
 *
 * For staff that is the whole list, which is what /see is. For a client it is
 * the pages that name their address — on the website's row or on the published
 * project behind it, which is one question answered by mayRead() per page.
 */
export async function listVisiblePages(viewer: Viewer): Promise<PageSummary[]> {
  if (!configured()) return [];

  return safely(
    "listVisiblePages",
    async () => {
      const { data } = await createSupabaseAdmin()
        .from("client_pages")
        .select("slug,title,client_name,summary,created_at,sort")
        .eq("active", true)
        .order("sort", { ascending: false })
        .order("created_at", { ascending: false });

      const rows = (data ?? []).map((r) => ({
        slug: r.slug as string,
        title: (r.title as string) ?? (r.slug as string),
        clientName: (r.client_name as string | null) ?? null,
        summary: (r.summary as string | null) ?? null,
        createdAt: (r.created_at as string) ?? ""
      }));

      if (seesEverything(viewer)) return rows;

      // This used to filter in the query, which was better: a list built by
      // reading everything and hiding most of it is one careless render away
      // from being a leak. It cannot any more. Half of a project page's readers
      // live in Client Hub rather than in this table, so membership is only
      // answerable per page — and a .contains() on allowed_emails would show a
      // customer an empty shelf while their sign-in link worked fine.
      //
      // Only the slug is used to decide; nothing about a page a viewer fails
      // this test for is returned. Keep it that way.
      const allowed = await Promise.all(rows.map((r) => mayRead(r.slug, viewer.email)));
      return rows.filter((_, i) => allowed[i]);
    },
    []
  );
}

/**
 * Whether this viewer may open one document.
 *
 * Asked directly rather than by searching listVisiblePages, so the page gate and
 * the index cannot drift apart: both end at the same two conditions, the page is
 * active and either the viewer is staff or their address is on it.
 */
export async function canReadSlug(viewer: Viewer, slug: string): Promise<boolean> {
  if (!configured()) return false;

  return safely(
    "canReadSlug",
    async () => {
      if (seesEverything(viewer)) {
        const page = await getPageRow(slug);
        return Boolean(page && page.active === true);
      }
      return mayRead(slug, viewer.email);
    },
    false
  );
}

/** Staff and owner, for the "who else is on this" line on /see. */
export async function listStaff(): Promise<Viewer[]> {
  if (!configured()) return [];

  return safely(
    "listStaff",
    async () => {
      const { data } = await createSupabaseAdmin()
        .from("portal_people")
        .select("email,name,role")
        .eq("active", true)
        .in("role", ["owner", "staff"])
        .order("role", { ascending: true })
        .order("email", { ascending: true });

      return (data ?? []).map((r) => ({
        email: r.email as string,
        name: (r.name as string | null) ?? null,
        role: (r.role as Role) ?? "staff"
      }));
    },
    []
  );
}

/** First name where we have one, address otherwise. Used to greet, nothing more. */
export function displayName(viewer: Viewer) {
  return viewer.name?.trim().split(/\s+/)[0] || viewer.email;
}
