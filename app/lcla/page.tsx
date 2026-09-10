import { cookies } from "next/headers";
import { LCLA_COOKIE, expectedToken, safeEqual } from "@/lib/lcla";
import { PROPOSAL_HTML } from "./content";
import "./lcla.css";

// Password-gated proposal for the LCLA schools. Reads a cookie, so it renders
// per-request; there is nothing here worth caching anyway.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "LCLA",
  // A client proposal naming a school and its budget. Keep it out of search
  // entirely — robots.ts disallows the path as well.
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "https://aventary.com/lcla" }
};

export default async function LclaPage({
  searchParams
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const expected = await expectedToken();
  const cookie = (await cookies()).get(LCLA_COOKIE)?.value ?? "";
  const unlocked = expected !== null && safeEqual(cookie, expected);

  if (unlocked) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Hebrew:wght@400;600&display=swap"
        />
        <div className="lcla" dangerouslySetInnerHTML={{ __html: PROPOSAL_HTML }} />
      </>
    );
  }

  const misconfigured = expected === null || e === "unconfigured";

  return (
    <main className="lcla-gate">
      <div className="lcla-gate-card">
        <p className="lcla-gate-eyebrow">Aventary</p>
        <h1>This page is private</h1>
        <p className="lcla-gate-sub">
          A proposal prepared for the leadership of Cheder Menachem and Bais Chaya Mushka.
          Enter the password you were given to read it.
        </p>

        {misconfigured ? (
          <p className="lcla-gate-error" role="alert">
            This page has not been configured yet. Set <code>LCLA_PASSWORD</code> in the
            site&rsquo;s environment variables and redeploy.
          </p>
        ) : (
          <form method="POST" action="/api/lcla/login">
            <label htmlFor="lcla-password">Password</label>
            <input
              id="lcla-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
            />
            {e === "1" && (
              <p className="lcla-gate-error" role="alert">
                That password is not right. Try again, or ask Mendy for it.
              </p>
            )}
            <button type="submit">Read the proposal</button>
          </form>
        )}

        <p className="lcla-gate-foot">
          Trouble getting in? <a href="/contact">Get in touch</a>.
        </p>
      </div>
    </main>
  );
}
