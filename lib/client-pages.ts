import { createSupabaseAdmin } from "@/lib/supabase/server";
import { CLIENT_PAGES, type ClientPageContent } from "@/content/clients";
import { getProjectAccess, getProjectPage } from "@/lib/project-pages";

// Access control for /c/<slug> pages.
//
// Content lives in the repo (content/clients) because it is authored, reviewed
// and versioned like anything else. Who may READ it lives in the database,
// because that changes far more often than the document does and should never
// require a deploy — let alone a trip to Cloudflare.
//
// Flow: visitor enters an email -> if it is on that page's allowlist, they get
// a single-use link valid for 20 minutes -> clicking it creates a 30-day
// session cookie scoped to that one page.

export const SESSION_DAYS = 30;
const TOKEN_MINUTES = 20;
const MAX_LINKS_PER_HOUR = 5;

export function cookieName(slug: string) {
  return `cp_${slug}`;
}

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/** URL-safe random string with 256 bits of entropy. */
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Tokens are stored hashed, so the database never holds a usable credential. */
export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The document behind /c/<slug>.
 *
 * Three sources, in this order:
 *
 * 1. Authored documents in content/clients win, always. They are written and
 *    reviewed like code, and nothing generated may shadow one by claiming its
 *    slug.
 * 2. A published Second Brain project, rendered from its public blocks. This is
 *    the one that scales: a project page is built in Client Hub and published
 *    with a checkbox, and no deploy happens at any point.
 * 3. client_page_documents — a one-off document generated into the database,
 *    which is how a page existed before projects could be published.
 *
 * Access control does not change with the source. It is keyed on the slug and
 * knows nothing about where the content came from.
 */
export async function getContent(slug: string): Promise<ClientPageContent | null> {
  const authored = CLIENT_PAGES[slug];
  if (authored) return authored;

  const project = await getProjectPage(slug);
  if (project) {
    return { title: project.title, blurb: project.blurb, html: project.html, mode: "document" };
  }

  if (!configured()) return null;
  try {
    const { data } = await createSupabaseAdmin()
      .from("client_page_documents")
      .select("title,blurb,html,mode")
      .eq("slug", slug)
      .maybeSingle();
    if (!data?.html) return null;
    return {
      title: (data.title as string) ?? "Private",
      blurb: (data.blurb as string) ?? "",
      html: data.html as string,
      mode: data.mode === "inline" ? "inline" : "document"
    };
  } catch (err) {
    // A lookup failure must read as "no such page", never as a 500 that hints
    // the slug exists.
    console.error("client-page content lookup failed", err);
    return null;
  }
}

export type PageRow = {
  slug: string;
  title: string;
  allowed_emails: string[];
  active: boolean;
  password_hash: string | null;
};

// Cloudflare Workers caps PBKDF2 at 100,000 iterations and throws
// NotSupportedError above it. That is the ceiling, not a considered choice:
// OWASP wants far more for PBKDF2-SHA-256. It is acceptable here because these
// are per-page document passwords, the hashes are not public, and the real
// control is the allowlisted sign-in link. Do not raise this without checking
// the platform still refuses it.
const PBKDF2_ITERATIONS = 100_000;

function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
function unb64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

/** Produces the value stored in client_pages.password_hash. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

/**
 * Constant-time verification against a stored hash.
 *
 * Returns false rather than throwing on anything malformed or unsupported —
 * including a hash written with more iterations than this runtime will accept,
 * which is what a 210,000-iteration hash from an earlier version looks like
 * here. A bad stored value must fail the sign-in, never 500 the request.
 */
export async function verifyPassword(password: string, stored: string) {
  try {
    const [scheme, iters, salt, expected] = stored.split("$");
    if (scheme !== "pbkdf2-sha256") return false;
    const iterations = Number(iters);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) {
      console.error(
        `client-page password hash needs ${iters} PBKDF2 iterations; this runtime allows ${PBKDF2_ITERATIONS}. Re-set the password.`
      );
      return false;
    }
    const actual = await pbkdf2(password, unb64(salt), iterations);
    const want = unb64(expected);
    if (actual.length !== want.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ want[i];
    return diff === 0;
  } catch (err) {
    console.error("client-page password verification failed", err);
    return false;
  }
}

/**
 * True when the server has what it needs to check access. Without it every
 * lookup below returns null, so a misconfigured deploy shows "not open yet"
 * rather than either crashing or — far worse — falling open.
 */
function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const PAGE_COLS = "slug,title,allowed_emails,active,password_hash";

export async function getPageRow(slug: string): Promise<PageRow | null> {
  if (!configured()) return null;
  const db = createSupabaseAdmin();
  const { data } = await db.from("client_pages").select(PAGE_COLS).eq("slug", slug).maybeSingle();
  if (data) return data as PageRow;
  return provisionFromProject(slug);
}

/**
 * Gives a published project page its access-control row the first time someone
 * asks for it, so publishing from Client Hub does not also require somebody to
 * run an insert over here.
 *
 * It only ever fires for a slug a published project already owns AND that
 * already names its readers, so this cannot open anything that was not
 * deliberately opened — a page with no readers stays "not open yet", which is
 * the direction a mistake should fail in. allowed_emails is left empty on
 * purpose: for a project page the reader list lives in Client Hub, and is
 * unioned in at sign-in.
 */
async function provisionFromProject(slug: string): Promise<PageRow | null> {
  const access = await getProjectAccess(slug);
  if (!access || access.readers.length === 0) return null;

  const db = createSupabaseAdmin();
  const { error } = await db
    .from("client_pages")
    .insert({ slug, title: access.title, allowed_emails: [], active: true });
  // 23505 means another request created it a moment ago — read it back either way.
  if (error && error.code !== "23505") {
    console.error("could not open access for published project page", slug, error);
    return null;
  }
  const { data } = await db.from("client_pages").select(PAGE_COLS).eq("slug", slug).maybeSingle();
  return (data as PageRow | null) ?? null;
}

/**
 * Everyone allowed to open this page: the addresses on the website's own row,
 * plus the reader list on the Second Brain project if one is published here.
 * A union, so a hand-built page keeps working exactly as before and a project
 * page can be opened to someone from Client Hub without a deploy.
 *
 * Exported because there is now a second thing that has to answer "may this
 * person read this?" — the customer login in lib/portal.ts. Both must ask here.
 * Reading page.allowed_emails directly looks correct and silently misses every
 * project-page reader, since a provisioned row deliberately leaves it empty.
 */
export async function readersFor(slug: string, page: PageRow): Promise<string[]> {
  const site = (page.allowed_emails ?? []).map(normalizeEmail);
  const project = (await getProjectAccess(slug))?.readers.map(normalizeEmail) ?? [];
  return Array.from(new Set([...site, ...project]));
}

/**
 * Issues a magic link when the address is allowed. Returns null in every other
 * case — unknown page, inactive page, address not on the list, rate limited.
 * Callers must show the same message either way: whether an address is on a
 * client's allowlist is itself information worth not leaking.
 */
export async function issueMagicLink(slug: string, email: string): Promise<string | null> {
  if (!configured()) return null;
  const page = await getPageRow(slug);
  if (!page || !page.active) return null;
  if (!(await readersFor(slug, page)).includes(email)) return null;

  const db = createSupabaseAdmin();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("client_page_tokens")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
    .eq("email", email)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_LINKS_PER_HOUR) return null;

  const token = randomToken();
  const { error } = await db.from("client_page_tokens").insert({
    slug,
    email,
    token_hash: await hashToken(token),
    expires_at: new Date(Date.now() + TOKEN_MINUTES * 60 * 1000).toISOString()
  });
  if (error) return null;
  return token;
}

/** Redeems a link once and opens a session. Returns the session cookie value. */
export async function redeemToken(slug: string, token: string): Promise<string | null> {
  if (!configured()) return null;
  const db = createSupabaseAdmin();
  const { data: row } = await db
    .from("client_page_tokens")
    .select("id,slug,email,expires_at,used_at")
    .eq("token_hash", await hashToken(token))
    .maybeSingle();

  if (!row || row.slug !== slug || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  // Mark used before opening the session: if two clicks race, only one wins.
  const { data: claimed } = await db
    .from("client_page_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return null;

  return openSession(slug, row.email as string, "link");
}

/** Creates a session and returns the cookie value. email is null for a password sign-in. */
export async function openSession(
  slug: string,
  email: string | null,
  method: "link" | "password"
): Promise<string | null> {
  if (!configured()) return null;
  const db = createSupabaseAdmin();
  const session = randomToken();
  const { error } = await db.from("client_page_sessions").insert({
    slug,
    email,
    method,
    session_hash: await hashToken(session),
    expires_at: new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString()
  });
  return error ? null : session;
}

/** Checks the page's shared password and opens a session on success. */
export async function signInWithPassword(slug: string, password: string): Promise<string | null> {
  const page = await getPageRow(slug);
  if (!page || !page.active || !page.password_hash) return null;
  if (!(await verifyPassword(password, page.password_hash))) return null;
  return openSession(slug, null, "password");
}

/** The live session for this page, or null. Also refreshes last_seen_at. */
export async function readSession(
  slug: string,
  cookie: string | undefined
): Promise<{ email: string | null; method: string } | null> {
  if (!configured()) return null;
  if (!cookie) return null;
  const db = createSupabaseAdmin();
  const { data } = await db
    .from("client_page_sessions")
    .select("id,slug,email,method,expires_at")
    .eq("session_hash", await hashToken(cookie))
    .maybeSingle();

  if (!data || data.slug !== slug) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  await db
    .from("client_page_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);
  return { email: (data.email as string | null) ?? null, method: (data.method as string) ?? "link" };
}

// Named entities these documents actually use, plus the ones likely to turn up.
// Anything unrecognised is left as written rather than mangled — a stray entity
// reads better in a prompt than a wrong character.
const NAMED_ENTITIES: Record<string, string> = {
  mdash: "—", ndash: "–", hellip: "…", middot: "·", bull: "•",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201C", rdquo: "\u201D",
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  times: "×", deg: "°"
};

/**
 * Plain text of a client page's document, for grounding the Ask widget.
 *
 * Diagrams collapse to their aria-label rather than being dropped: those labels
 * were written to state what the picture shows, so the model can answer about a
 * diagram it cannot see. SVG coordinates would otherwise flood the prompt with
 * numbers that mean nothing.
 */
export function documentText(html: string): string {
  const withDiagrams = html.replace(
    /<svg\b[^>]*?aria-label="([^"]*)"[\s\S]*?<\/svg>/gi,
    (_m, label) => `\n[Diagram: ${label}]\n`
  );
  return withDiagrams
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|h1|h2|h3|li|tr|figcaption|dd)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Records what a reader asked. Best effort — a logging failure must not break the answer. */
export async function logQuestion(slug: string, email: string | null, question: string) {
  if (!configured()) return;
  try {
    await createSupabaseAdmin()
      .from("client_page_questions")
      .insert({ slug, email, question: question.slice(0, 2000) });
  } catch (err) {
    console.error("client-page question log failed", err);
  }
}
