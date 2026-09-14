import Link from "next/link";
import type { PageSummary } from "@/lib/portal";

// Shared furniture for the two signed-in indexes, /c and /see. Both show the
// same sign-in card when nobody is signed in, because they are two views of one
// login rather than two logins.

const FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

export function PortalFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONTS} />
    </>
  );
}

/**
 * The way in.
 *
 * `next` is where the link should land — so a staff member sent to /see comes
 * back to /see, and someone who followed a link to one document returns to that
 * document rather than to a list. `from` is where this form lives, which is
 * where the "check your mail" message has to appear.
 *
 * The confirmation is identical whether or not the address is known. Whether
 * someone is a customer of ours is not a fact this form is willing to confirm
 * to a stranger who guesses.
 */
export function SignInCard({
  title,
  sub,
  next,
  from,
  sent,
  error
}: {
  title: string;
  sub: string;
  next: string;
  from: string;
  sent?: boolean;
  error?: string;
}) {
  return (
    <main className="pl">
      <div className="pl-gate">
        <div className="pl-card">
          <p className="pl-eyebrow">Aventary</p>
          <h1>{title}</h1>
          <p className="pl-card-sub">{sub}</p>

          {sent ? (
            <p className="pl-ok" role="status">
              If that address is one we know, a sign-in link is on its way. It is good for
              20 minutes and can be used once.
            </p>
          ) : (
            <form method="POST" action="/api/portal/request">
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="from" value={from} />
              <label htmlFor="portal-email">Your email</label>
              <input
                id="portal-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                autoFocus
                required
              />
              {error === "expired" && (
                <p className="pl-error" role="alert">
                  That link has expired or was already used. Ask for a fresh one.
                </p>
              )}
              {error === "mail" && (
                <p className="pl-error" role="alert">
                  This site cannot send mail right now, so no link went out — to
                  anyone. Nothing to do with your address. Please{" "}
                  <a href="/contact">let us know</a>.
                </p>
              )}
              <button type="submit">Email me a sign-in link</button>
              <p className="pl-note">
                No password. The link opens everything shared with your address and stays
                signed in for 30 days.
              </p>
            </form>
          )}

          <p className="pl-card-foot">
            Expecting access and not getting it? <Link href="/contact">Get in touch</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}

/** The signed-in identity, and the way out of it. */
export function WhoAmI({ email, role }: { email: string; role: string }) {
  return (
    <div className="pl-who">
      <div>
        Signed in as <strong>{email}</strong>
        {role !== "client" && <> · {role}</>}
      </div>
      <form method="POST" action="/portal/signout">
        <button type="submit" className="pl-signout">
          Sign out
        </button>
      </form>
    </div>
  );
}

/** One row per document. `showClient` is the only thing /see adds over /c. */
export function PageList({
  pages,
  showClient
}: {
  pages: PageSummary[];
  showClient: boolean;
}) {
  return (
    <ul className="pl-list">
      {pages.map((p) => (
        <li key={p.slug} className="pl-item">
          <Link href={`/c/${p.slug}`}>
            {showClient && p.clientName && <p className="pl-client">{p.clientName}</p>}
            <h2 className="pl-title">{p.title}</h2>
            {showClient && p.summary && <p className="pl-summary">{p.summary}</p>}
            <span className="pl-open" aria-hidden="true">
              Open →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
