import type { Metadata } from "next";
import Link from "next/link";
import { fontVars } from "../fonts";
import "../tehillim.css";

export const metadata: Metadata = {
  title: "Tehillim — Privacy Policy",
  description:
    "How the Tehillim app handles your information: email sign-in, your saved Psalms and circle, no ads, no tracking, no selling of data.",
};

const UPDATED = "September 16, 2026";
const CONTACT = "mendy@aventary.com";

export default function TehillimPrivacyPage() {
  return (
    <div className={`tehillim-page ${fontVars}`} style={{ background: "var(--paper)", minHeight: "100vh" }}>
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
          style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" }}
        >
          ← Tehillim
        </Link>

        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.4rem)", margin: "1.25rem 0 0.35rem", color: "var(--accent)" }}>
          Privacy Policy
        </h1>
        <p style={{ color: "var(--muted)", margin: "0 0 2rem", fontSize: "0.95rem" }}>
          Tehillim (tehillimcircle.com) · Last updated {UPDATED}
        </p>

        <p>
          Tehillim is a Psalms reader. This policy explains what information the app
          collects, why, and what we do — and don&apos;t do — with it. It is written to
          be short because the app collects very little.
        </p>

        <Section title="What we collect">
          <ul style={ulStyle}>
            <li>
              <strong>Your email address</strong>, when you choose to sign in. We use a
              &ldquo;magic link&rdquo; — you enter your email, we send you a link, and clicking it
              signs you in. We never ask for or store a password.
            </li>
            <li>
              <strong>Your saved Psalms</strong> and reading preferences, so they follow
              you across devices when you are signed in.
            </li>
            <li>
              <strong>Your &ldquo;circle&rdquo; connections</strong> — if you share the app and
              someone signs in from your link, we record that connection and a count of
              chapters (perakim) said, to show the encouragement counter on the home
              screen. This is a count and a link between accounts, nothing more.
            </li>
          </ul>
          <p>
            You can use the app to read Tehillim without signing in at all. In that case
            we collect none of the above.
          </p>
        </Section>

        <Section title="What we do not do">
          <ul style={ulStyle}>
            <li>We do not sell or rent your information to anyone.</li>
            <li>We do not share it with advertisers, and the app shows no ads.</li>
            <li>We do not use third-party analytics or advertising trackers.</li>
            <li>
              Read-aloud uses your device&apos;s own built-in voice. No audio and no verse
              text is sent anywhere to produce the speech.
            </li>
          </ul>
        </Section>

        <Section title="Who processes your data">
          <p>
            Your account information is stored with our infrastructure providers on our
            behalf: <strong>Supabase</strong> (database and email sign-in) and{" "}
            <strong>Cloudflare</strong> (hosting). They process it only to run the app and
            do not use it for their own purposes.
          </p>
        </Section>

        <Section title="Keeping and deleting your data">
          <p>
            We keep your account data for as long as your account exists. You can ask us to
            delete your account and everything associated with it at any time — email{" "}
            <a href={`mailto:${CONTACT}`} style={linkStyle}>{CONTACT}</a> and we will remove
            it.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The app is not directed at children under 13, and we do not knowingly collect
            information from them.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes, we will update the date at the top of this page. Your
            continued use of the app after a change means you accept the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or your data? Email{" "}
            <a href={`mailto:${CONTACT}`} style={linkStyle}>{CONTACT}</a>.
          </p>
        </Section>
      </main>
    </div>
  );
}

const ulStyle: React.CSSProperties = { paddingLeft: "1.2rem", margin: "0 0 1rem" };
const linkStyle: React.CSSProperties = { color: "var(--accent)", textDecoration: "underline" };

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
