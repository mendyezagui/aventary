import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cookieName, getContent, getPageRow, readSession } from "@/lib/client-pages";
import { PORTAL_COOKIE, canReadSlug, readPortalSession, seesEverything } from "@/lib/portal";
import { AskPanel } from "./AskPanel";
import { DocFrame } from "./DocFrame";
import "./client-page.css";

export const dynamic = "force-dynamic";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Hebrew:wght@400;600&display=swap";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await getContent(slug);
  return {
    title: content?.title ?? "Private",
    // Client documents have no business in search. robots.ts disallows /c too.
    robots: { index: false, follow: false, nocache: true }
  };
}

/**
 * One client document.
 *
 * There are two ways to be let in here and they are checked independently.
 *
 *  - A PAGE session: the cp_<slug> cookie, from a link emailed for this one
 *    document or from its shared password. Scoped to this page and nothing else.
 *  - A PORTAL session: the customer login at /c. One identity, and what it may
 *    open is decided per request from the role and the page's allowlist.
 *
 * Either is sufficient. Keeping the first means every link and password already
 * out in the world went on working the day the login shipped, which is not a
 * nicety — those are in clients' inboxes and we do not get to invalidate them on
 * a deploy.
 */
export default async function ClientPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sent?: string; e?: string }>;
}) {
  const { slug } = await params;
  const { sent, e } = await searchParams;

  const content = await getContent(slug);
  if (!content) notFound();

  // Three independent lookups, so they go together rather than in a queue —
  // this runs on a Worker and each one is a round trip to Supabase.
  const jar = await cookies();
  const [row, pageSession, viewer] = await Promise.all([
    getPageRow(slug),
    readSession(slug, jar.get(cookieName(slug))?.value),
    readPortalSession(jar.get(PORTAL_COOKIE)?.value)
  ]);
  const viewerMayRead = viewer ? await canReadSlug(viewer, slug) : false;

  if (pageSession || viewerMayRead) {
    const backTo = viewer && seesEverything(viewer) ? "/see" : "/c";
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
        <AskPanel slug={slug} title={content.title} />
        {content.mode === "document" ? (
          <DocFrame html={content.html} title={content.title} />
        ) : (
          <div className="lcla" dangerouslySetInnerHTML={{ __html: content.html }} />
        )}
        <p className="cp-whoami">
          {viewerMayRead && viewer ? (
            <>
              Signed in as {viewer.email}. <Link href={backTo}>All your documents</Link>.
            </>
          ) : pageSession?.email ? (
            `Signed in as ${pageSession.email}.`
          ) : (
            "Signed in with the shared password."
          )}{" "}
          This document is confidential to its named recipients.
        </p>
      </>
    );
  }

  // Signed in to the portal, but this page is not theirs. Say so plainly rather
  // than showing a sign-in form they have already used — and without the title,
  // which is the one thing on the gate that is worth withholding from somebody
  // who has guessed at a slug.
  if (viewer) {
    return (
      <main className="cp-gate">
        <div className="cp-gate-card">
          <p className="cp-gate-eyebrow">Aventary</p>
          <h1>Not shared with you</h1>
          <p className="cp-gate-sub">
            You are signed in as {viewer.email}, and this page is not open to that address.
          </p>
          <p className="cp-gate-note">
            <Link href="/c">Back to your documents</Link> — or{" "}
            <Link href="/contact">ask for access</Link> if you were expecting this one.
          </p>
        </div>
      </main>
    );
  }

  // No page row means the document exists in the repo but nobody has been
  // granted access yet — worth saying out loud rather than silently failing.
  const unconfigured = !row || !row.active;

  return (
    <main className="cp-gate">
      <div className="cp-gate-card">
        <p className="cp-gate-eyebrow">Aventary</p>
        <h1>{content.title}</h1>
        <p className="cp-gate-sub">{content.blurb}</p>

        {unconfigured ? (
          <p className="cp-gate-error" role="alert">
            This page is not open yet. No reader list has been set for{" "}
            <code>{slug}</code>.
          </p>
        ) : (
          <>
            {row.password_hash && (
              <form method="POST" action={`/api/c/${slug}/password`} className="cp-form">
                <label htmlFor="cp-password">Password</label>
                <input
                  id="cp-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                {e === "password" && (
                  <p className="cp-gate-error" role="alert">
                    That password is not right.
                  </p>
                )}
                <button type="submit">Open the document</button>
              </form>
            )}

            {row.password_hash && <p className="cp-or"><span>or</span></p>}

            {sent ? (
              <p className="cp-gate-ok" role="status">
                If that address is on the list for this page, a sign-in link is on its way.
                It is good for 20 minutes and can be used once.
              </p>
            ) : (
              <form method="POST" action={`/api/c/${slug}/request`} className="cp-form">
                <label htmlFor="cp-email">Your email</label>
                <input
                  id="cp-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  autoFocus={!row.password_hash}
                  required
                />
                {e === "expired" && (
                  <p className="cp-gate-error" role="alert">
                    That link has expired or was already used. Request a fresh one.
                  </p>
                )}
                <button type="submit" className={row.password_hash ? "cp-secondary" : ""}>
                  Email me a sign-in link
                </button>
                <p className="cp-gate-note">
                  A link to an address already on the list for this page. No password needed.
                </p>
              </form>
            )}
          </>
        )}

        <p className="cp-gate-foot">
          Already signed in with Aventary? <Link href="/c">Your documents</Link>.
          <br />
          Expecting access and not getting it? <a href="/contact">Get in touch</a>.
        </p>
      </div>
    </main>
  );
}
