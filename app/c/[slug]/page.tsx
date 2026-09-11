import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cookieName, getContent, getPageRow, sessionEmail } from "@/lib/client-pages";
import "./client-page.css";

export const dynamic = "force-dynamic";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Hebrew:wght@400;600&display=swap";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getContent(slug);
  return {
    title: content?.title ?? "Private",
    // Client documents have no business in search. robots.ts disallows /c too.
    robots: { index: false, follow: false, nocache: true }
  };
}

export default async function ClientPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sent?: string; e?: string }>;
}) {
  const { slug } = await params;
  const { sent, e } = await searchParams;

  const content = getContent(slug);
  if (!content) notFound();

  const row = await getPageRow(slug);
  const email = await sessionEmail(slug, (await cookies()).get(cookieName(slug))?.value);

  if (email) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
        <div className="lcla" dangerouslySetInnerHTML={{ __html: content.html }} />
        <p className="cp-whoami">
          Signed in as {email}. This document is confidential to its named recipients.
        </p>
      </>
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
        ) : sent ? (
          <p className="cp-gate-ok" role="status">
            If that address is on the list for this page, a sign-in link is on its way.
            It is good for 20 minutes and can be used once.
          </p>
        ) : (
          <form method="POST" action={`/api/c/${slug}/request`}>
            <label htmlFor="cp-email">Your email</label>
            <input
              id="cp-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              autoFocus
              required
            />
            {e === "expired" && (
              <p className="cp-gate-error" role="alert">
                That link has expired or was already used. Request a fresh one.
              </p>
            )}
            <button type="submit">Email me a sign-in link</button>
            <p className="cp-gate-note">
              No password. We send a link to an address already on the list for this page.
            </p>
          </form>
        )}

        <p className="cp-gate-foot">
          Expecting access and not getting it? <a href="/contact">Get in touch</a>.
        </p>
      </div>
    </main>
  );
}
