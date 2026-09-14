import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PORTAL_COOKIE,
  displayName,
  listStaff,
  listVisiblePages,
  readPortalSession,
  seesEverything
} from "@/lib/portal";
import { mailHealth, recentMailTrouble } from "@/lib/mail";
import { PageList, PortalFonts, SignInCard, WhoAmI } from "../portal/ui";
import "../portal/portal.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projects",
  robots: { index: false, follow: false, nocache: true }
};

/**
 * /see — every active project, for Mendy and for the people who work with him.
 *
 * The list is the same rows the customer login serves from, read without the
 * allowlist filter. That is deliberate: one table decides what exists and who
 * may open it, so the staff index and a customer's own shelf can never drift
 * into disagreeing about either. Opening a project from here lands on exactly
 * the page the client sees.
 *
 * It reads the website's own database and nothing else. The temptation is to
 * point this at the Second Brain CRM and list projects live — and the reason not
 * to is on the record: that schema has changed underneath this repo twice in a
 * week (public_enabled became page_published, page_readers appeared), so a live
 * read would have gone down with it. What a client can be shown is decided here,
 * in the same place that decides who may see it.
 */
export default async function ProjectIndex({
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
          title="Projects"
          sub="Sign in to open the project index."
          next="/see"
          from="/see"
          sent={sent === "1"}
          error={e}
        />
      </>
    );
  }

  // A signed-in customer who finds this URL goes to their own shelf rather than
  // being told what they are missing. The project list names other people's
  // clients; that it exists is not something to confirm.
  if (!seesEverything(viewer)) redirect("/c");

  const [pages, staff, trouble] = await Promise.all([
    listVisiblePages(viewer),
    listStaff(),
    recentMailTrouble()
  ]);
  const colleagues = staff.filter((s) => s.email !== viewer.email);
  const mail = mailHealth();
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });

  return (
    <>
      <PortalFonts />
      <main className="pl">
        <div className="pl-wrap">
          <p className="pl-eyebrow">Aventary · internal</p>
          <div className="pl-head">
            <h1>
              {pages.length} active {pages.length === 1 ? "project" : "projects"}
            </h1>
            <WhoAmI email={viewer.email} role={viewer.role} />
          </div>

          {!mail.ok && (
            <p className="pl-warn" role="alert">
              <strong>Nobody can sign in.</strong> This deploy cannot send mail, so
              every sign-in link is failing silently — for employees and customers
              alike. Missing Worker {mail.missing.length === 1 ? "secret" : "secrets"}:{" "}
              {mail.missing.map((k) => (
                <code key={k}>{k}</code>
              ))}
              . Set {mail.missing.length === 1 ? "it" : "them"} in Cloudflare on this
              Worker and the links start arriving; nothing needs redeploying here.
            </p>
          )}

          {mail.ok && trouble.failures > 0 && (
            <p className="pl-warn" role="alert">
              <strong>
                {trouble.failures} {trouble.failures === 1 ? "email" : "emails"} failed to send
              </strong>{" "}
              in the last 7 days. Nobody gets told when this happens — a sign-in form must
              not confirm whose address it knows, and a missed inquiry has nobody to tell at
              all — so this page is the only place it shows.
              {trouble.lastError && (
                <>
                  {" "}
                  Most recent: <code>{trouble.lastError.error}</code> — to{" "}
                  {trouble.lastError.email} ({trouble.lastError.context}) at{" "}
                  {when(trouble.lastError.at)}.
                </>
              )}
              {trouble.lastSuccessAt && (
                <>
                  {" "}
                  The last email that did go out was {when(trouble.lastSuccessAt)}, so the
                  mailer is not dead — check the address before the plumbing.
                </>
              )}
            </p>
          )}

          <p className="pl-lede">
            Everything open to a client right now, {displayName(viewer)}. Each one opens the
            page that client sees, exactly as they see it — there is no separate internal
            view to keep in step.
          </p>

          {pages.length ? (
            <PageList pages={pages} showClient />
          ) : (
            <div className="pl-empty">
              <p>No client pages are open.</p>
              <p>
                A project appears here once it has a row in <code>client_pages</code> and is
                active. See <code>docs/customer-login.md</code>.
              </p>
            </div>
          )}

          <p className="pl-foot">
            {colleagues.length
              ? `Also here: ${colleagues.map((c) => c.name || c.email).join(", ")}.`
              : "You are the only person with this view."}{" "}
            Everyone on this page sees every project. Adding somebody is one row in{" "}
            <code>portal_people</code>.
            {mail.ok && trouble.failures === 0 && trouble.lastSuccessAt && (
              <> Last email sent {when(trouble.lastSuccessAt)}.</>
            )}
          </p>
        </div>
      </main>
    </>
  );
}
