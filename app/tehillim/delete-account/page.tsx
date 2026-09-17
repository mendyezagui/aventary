import type { Metadata } from "next";
import Link from "next/link";
import { fontVars } from "../fonts";
import "../tehillim.css";

export const metadata: Metadata = {
  title: "Tehillim — Delete your account",
  description:
    "How to have your Tehillim account, your saved Psalms and your circle permanently erased.",
  robots: { index: false, follow: false },
};

const CONTACT = "mendy@aventary.com";

/**
 * Google Play requires this page for any app that lets people make an account,
 * and requires it to be reachable **without signing in** — the point is that
 * somebody who has lost access to their email, or who never wants to open the
 * app again, can still have their data removed. So it lives outside the app,
 * takes no session, and spells the address out rather than hiding it behind a
 * form that needs a login.
 *
 * There is no self-service delete button because sign-in here is a magic link:
 * proving who is asking means reading an email either way, and a button that
 * silently wipes a stranger's saved Psalms because they typed an address is
 * worse than a short exchange.
 */
export default function TehillimDeleteAccountPage() {
  return (
    <div
      className={`tehillim-page ${fontVars}`}
      style={{ background: "var(--paper)", minHeight: "100vh" }}
    >
      <main
        style={{
          maxWidth: "44rem",
          margin: "0 auto",
          padding: "clamp(1.5rem, 4vw, 3rem) 1rem 4rem",
          color: "var(--ink)",
          lineHeight: 1.65,
        }}
      >
        <Link
          href="/tehillim"
          style={{
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          ← Tehillim
        </Link>

        <h1
          style={{
            fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
            margin: "1.25rem 0 0.35rem",
            color: "var(--accent)",
          }}
        >
          Delete your account
        </h1>
        <p style={{ margin: "0 0 1.5rem", opacity: 0.75 }}>
          Tehillim (tehillimcircle.com) · You can ask at any time, whether or not
          you can still sign in.
        </p>

        <Section title="How to ask">
          <p>
            Email{" "}
            <a
              href={`mailto:${CONTACT}?subject=Delete%20my%20Tehillim%20account`}
              style={linkStyle}
            >
              {CONTACT}
            </a>{" "}
            with <strong>&ldquo;Delete my account&rdquo;</strong> as the subject,
            from the address you signed in with. If you can no longer reach that
            address, write from any address and tell us which one it was.
          </p>
          <p>
            Requests are actioned within seven days, and you get a note back
            confirming it is done.
          </p>
        </Section>

        <Section title="What gets deleted">
          <ul style={ulStyle}>
            <li>Your account and the email address attached to it.</li>
            <li>Your saved Psalms and your reading preferences.</li>
            <li>
              Your circle: the link between your account and anyone who signed in
              from your share link, and the count of perakim shown on the home
              screen.
            </li>
          </ul>
          <p>
            All of it, permanently. Nothing is kept in an archive and there is no
            backup copy held for later.
          </p>
        </Section>

        <Section title="What happens to the people in your circle">
          <p>
            Their accounts and their own saved Psalms are untouched. What goes is
            the connection between you and them, so the counter no longer credits
            their perakim to your circle.
          </p>
        </Section>

        <Section title="You may not need this page">
          <p>
            Signing out does not delete anything, and you can use Tehillim
            without an account at all — the daily portion, every Psalm, saved
            Psalms and Tehillim for a name all work signed out. Saved Psalms kept
            that way live only on your phone, and clearing the app&rsquo;s data
            removes them without anyone being asked.
          </p>
        </Section>

        <Section title="Questions">
          <p>
            <a href={`mailto:${CONTACT}`} style={linkStyle}>
              {CONTACT}
            </a>
            {" · "}
            <Link href="/tehillim/privacy" style={linkStyle}>
              Privacy policy
            </Link>
          </p>
        </Section>
      </main>
    </div>
  );
}

const ulStyle: React.CSSProperties = { paddingLeft: "1.2rem", margin: "0 0 1rem" };
const linkStyle: React.CSSProperties = { color: "var(--accent)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: "2rem 0 0" }}>
      <h2
        style={{
          fontSize: "1.25rem",
          margin: "0 0 0.6rem",
          color: "var(--ink)",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "0.35rem",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
