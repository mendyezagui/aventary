import Link from "next/link";
import { cookies } from "next/headers";
import {
  PORTAL_COOKIE,
  displayName,
  listVisiblePages,
  readPortalSession,
  seesEverything
} from "@/lib/portal";
import { PageList, PortalFonts, SignInCard, WhoAmI } from "../portal/ui";
import "../portal/portal.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  // Nothing under /c belongs in a search result, including the door.
  robots: { index: false, follow: false, nocache: true }
};

/**
 * /c — the customer login.
 *
 * Everything under /c is behind this. A customer signs in once with their
 * address and finds what has been shared with it; they never need a URL per
 * document, and we never need to tell them one exists before deciding they may
 * see it.
 *
 * A shared-password session does not reach this page, by design. Those sessions
 * have no identity — the access log records them as "(shared password)" because
 * that is the truth — so there is nobody to build a list for. A password opens
 * the one document it was used on, which is what a password is good for.
 */
export default async function CustomerHome({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; e?: string }>;
}) {
  const { sent, e } = await searchParams;
  const viewer = await readPortalSession((await cookies()).get(PORTAL_COOKIE)?.value);

  if (!viewer) {
    return (
      <>
        <PortalFonts />
        <SignInCard
          title="Your documents"
          sub="Everything Aventary has shared with you, in one place."
          next="/c"
          from="/c"
          sent={sent === "1"}
          error={e}
        />
      </>
    );
  }

  const pages = await listVisiblePages(viewer);
  const staff = seesEverything(viewer);

  return (
    <>
      <PortalFonts />
      <main className="pl">
        <div className="pl-wrap">
          <p className="pl-eyebrow">Aventary</p>
          <div className="pl-head">
            <h1>{staff ? "Every document" : `Hello, ${displayName(viewer)}`}</h1>
            <WhoAmI email={viewer.email} role={viewer.role} />
          </div>

          {staff ? (
            <p className="pl-lede">
              You are signed in as {viewer.role}, so this is every open document rather
              than a customer&rsquo;s own shelf. <Link href="/see">The project index</Link> is the
              same list with the client and the working note attached.
            </p>
          ) : (
            <p className="pl-lede">
              {pages.length === 1
                ? "This is what has been shared with you."
                : "These are the documents shared with you."}{" "}
              Anything new turns up here without you needing a new link.
            </p>
          )}

          {pages.length ? (
            <PageList pages={pages} showClient={staff} />
          ) : (
            <div className="pl-empty">
              <p>Nothing is shared with {viewer.email} yet.</p>
              <p>
                If you were expecting something, it may have been sent to a different
                address — <Link href="/contact">tell us which one</Link> and we will move it.
              </p>
            </div>
          )}

          <p className="pl-foot">
            These documents are confidential to the people they name. Your sign-in lasts 30
            days on this device.
          </p>
        </div>
      </main>
    </>
  );
}
