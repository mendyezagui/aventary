import Link from "next/link";
import { PROJECTS, CAPABILITIES, RESULTS } from "@/lib/work";
import WorkExplorer from "@/components/WorkExplorer";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/work";
const TITLE = "Work | Aventary";
const DESCRIPTION =
  "Shipped products and production engagements — with the receipts. Live software, enterprise integrations, and AI systems built by an operator, not a slide deck.";

export const metadata = {
  title: "Work",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function WorkPage() {
  return (
    <>
      {/* HERO */}
      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
            <span className="material-symbols-outlined text-base">deployed_code</span>
            Work &amp; Receipts
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold editorial-gap leading-[1.08] mb-8 max-w-5xl">
            Shipped software, not slideware.{" "}
            <span className="text-primary italic">With the receipts.</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-3xl mb-10">
            Products live in the app stores and on the open web. Enterprise integrations running in
            production. AI systems with governance, not demos. Filter by capability below — every
            card expands to the problem, the build, and the receipts.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact#book"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
            >
              Book a call
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href="/method"
              className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-6 py-3 rounded-full font-bold soft-lift"
            >
              See the method
            </Link>
          </div>
        </div>
      </section>

      {/* RESULTS — just the numbers, every one traceable to a project below */}
      <section className="px-8 py-16 bg-ink text-inverse-on-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Results, by the numbers
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold leading-[1.1] mb-10 max-w-3xl">
            Real outcomes in production<span className="text-primary italic">.</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
            {RESULTS.map((r) => (
              <div key={`${r.source}-${r.label}`}>
                <div className="font-headline text-3xl md:text-4xl font-bold text-primary leading-none">
                  {r.value}
                </div>
                <div className="text-white/80 text-sm mt-2 leading-snug">{r.label}</div>
                <div className="font-label text-[10px] tracking-[0.16em] uppercase text-white/40 mt-2">
                  {r.source}
                </div>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-10 max-w-2xl">
            Every figure ties to a specific engagement below — no aggregates, no rounding up.
          </p>
        </div>
      </section>

      {/* FILTERS + CATALOG (interactive) */}
      <WorkExplorer projects={PROJECTS} capabilities={CAPABILITIES} />

      {/* WHO BUILT THIS — a short background, with the long version a click away */}
      <section className="px-8 py-20 md:py-24 bg-surface-container">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-10 md:gap-14 md:items-start">
            <div
              aria-hidden="true"
              className="shrink-0 w-20 h-20 rounded-full bg-primary text-on-primary font-headline font-bold text-2xl flex items-center justify-center"
            >
              ME
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-accent font-label font-bold text-xs tracking-[0.18em] uppercase mb-3">
                Who builds it
              </div>
              <h2 className="font-headline text-3xl md:text-4xl font-bold editorial-gap leading-[1.1] mb-6">
                An operator, not a slide deck
                <span className="text-primary italic">.</span>
              </h2>

              <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed mb-5">
                Aventary is <strong className="text-on-surface">Mendy Ezagui</strong> — fifteen
                years of product and transformation work. Five of them at{" "}
                <strong className="text-on-surface">PwC</strong> in Technology &amp; Transformation
                Advisory, directing <strong className="text-on-surface">$1B+</strong> in enterprise
                transformation value across 20+ programs and leading the design of the firm&rsquo;s
                first client-facing GenAI sales agent. Before that, co-founder and CPO of a
                logistics automation platform taken from a sketch to{" "}
                <strong className="text-on-surface">$1M ARR</strong>, a product turnaround at
                Sallie Mae, and five applications at Chabad.org adopted by{" "}
                <strong className="text-on-surface">600+ organizations</strong>.
              </p>
              <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed mb-8">
                MBA in Finance from Baruch&rsquo;s Zicklin School of Business.{" "}
                <strong className="text-on-surface">Salesforce Certified 14×</strong>, including all
                three generative-AI credentials. Vetted in the top 3% of product talent by Toptal.
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/team/mendy"
                  className="inline-flex items-center gap-2 bg-ink text-inverse-on-surface px-6 py-3 rounded-full font-bold"
                >
                  Read the full background
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <a
                  href="https://www.linkedin.com/in/mendyezagui/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent font-label font-bold text-sm link-underline"
                >
                  Connect on LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 bg-ink text-inverse-on-surface">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Have something that needs building
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
            The next receipt could be yours
            <span className="text-primary italic">.</span>
          </h2>
          <p className="text-xl text-white/70 mb-10">
            Products, Salesforce and RevOps systems, AI with a harness, enterprise integrations.
            Book a working session and we&apos;ll scope the smallest complete build that moves a real
            outcome.
          </p>
          <Link
            href="/contact#book"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-lg"
          >
            Book a Working Session
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    </>
  );
}
