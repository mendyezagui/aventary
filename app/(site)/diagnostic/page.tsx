import Link from "next/link";
import DiagnosticApp from "@/components/DiagnosticApp";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/diagnostic";
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
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION
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
            Find where your operating system is{" "}
            <span className="text-primary italic">leaking value</span>.
          </h1>
          <p className="text-xl text-on-surface-variant mb-4">
            Most dashboards tell you what happened. This diagnostic examines the machinery
            underneath: outcomes, workflow visibility, ownership, handoffs, system truth, exceptions,
            AI controls, and whether your metrics actually create decisions.
          </p>
          <p className="text-sm text-on-surface-variant">
            <strong className="text-on-surface">5 minutes</strong> · 24 questions · scored across 8
            domains. See your{" "}
            <span className="text-on-surface">
              operating score, maturity level, weakest domain, and recommended next action
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
