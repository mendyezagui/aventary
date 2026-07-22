import Link from "next/link";
import DiagnosticApp from "@/components/DiagnosticApp";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/diagnostic";
const OG_IMAGE = "https://aventary.com/og-diagnostic.png";
const TITLE = "Aventary Operating Systems Diagnostic | Aventary";
const DESCRIPTION =
  "Score the operating system behind your revenue, service, Salesforce, and AI workflows in 5 minutes. Find the weakest link and what to build next.";

export const metadata = {
  title: "Operating Systems Diagnostic",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Aventary Operating Systems Diagnostic" }],
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE]
  }
};

export default function DiagnosticPage() {
  return (
    <>
      {/* HERO */}
      <section className="px-8 pt-24 pb-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
            <span className="material-symbols-outlined text-base">radar</span>
            Operating Systems Diagnostic
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold editorial-gap leading-[1.08] mb-6">
            Find where revenue is leaking{" "}
            <span className="text-primary italic">before it hits your forecast</span>.
          </h1>
          <p className="text-xl text-on-surface-variant mb-4">
            Your dashboard tells you what already happened. This 5-minute check finds the gaps
            upstream — the leads nobody worked, the handoffs that dropped, the AI that isn&apos;t
            paying off — and names the one thing to fix first.
          </p>
          <p className="text-sm text-on-surface-variant">
            <strong className="text-on-surface">5 minutes</strong> · 24 questions · 8 areas. You&apos;ll
            see your{" "}
            <span className="text-on-surface">
              score, where you stand, your biggest gap, and what to do about it
            </span>
            .
          </p>
          <p className="text-sm text-on-surface-variant mt-6">
            Prefer to skip ahead?{" "}
            <Link href="/appointments" className="text-accent underline underline-offset-2">
              Book a diagnostic review
            </Link>{" "}
            or read{" "}
            <Link href="/method" className="text-accent underline underline-offset-2">
              the method behind it
            </Link>
            .
          </p>
        </div>
      </section>

      <DiagnosticApp />
    </>
  );
}
