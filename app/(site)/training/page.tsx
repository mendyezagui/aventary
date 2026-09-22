import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/training";
const TITLE = "Executive & Leadership AI Training | Aventary";
const DESCRIPTION =
  "Practical AI training for executives and leadership teams, built around real work, clear boundaries, and human review.";

export const metadata = {
  title: "Executive & Leadership AI Training",
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

const USE_CASES = [
  ["Gather everything still outstanding from yesterday", "Get suggested next steps without sorting through it all yourself."],
  ["Before your next call, get a concise brief", "Bring together the client, the people, and your history with them."],
  ["Find what is buried across your documents", "Get the relevant information without manually searching through everything."],
  ["Turn rough thoughts into a clear response", "Draft an email, memo, or reply while you keep the final say."],
  ["Bring scattered information together before a decision", "See the relevant facts, gaps, and questions in one place."],
  ["Stop repeating the same manual work", "Teach AI to help with the tasks you do again and again."]
];

const TRUST = [
  ["Boundaries", "Decide what information can be used, what is sensitive, and what stays out."],
  ["Access", "Use the right access for the task and no more than is needed."],
  ["Retention", "Understand the retention settings of the tools you choose."],
  ["Human review", "Check important outputs and keep people responsible for consequential decisions."],
  ["Less exposure", "Avoid putting sensitive information into tools or prompts unnecessarily."],
  ["Clear choices", "Choose tools and working practices based on the work and its requirements."]
];

export default function TrainingPage() {
  return (
    <>
      <section className="px-6 md:px-8 pt-12 md:pt-16 pb-10 md:pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-5xl">
            <h1 className="font-headline text-4xl md:text-6xl lg:text-[5rem] font-bold leading-[.96] text-accent mb-4">
              Executive &amp; Leadership AI Training
            </h1>
            <h2 className="font-headline text-2xl md:text-4xl lg:text-[3.5rem] font-bold leading-[1] mb-4">
              Practical AI for <span className="text-primary italic">real work.</span>
            </h2>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-5 leading-relaxed">
              Bring an unresolved problem. We will help you use AI to solve it yourself—one-to-one or with your team.
            </p>
            <div className="border-y border-outline-variant/40 py-3 mb-5 max-w-3xl">
              <div className="font-label font-bold text-sm tracking-widest mb-1">TRUST. PRIVACY. SECURITY.</div>
              <p className="text-sm md:text-base text-on-surface-variant">
                Clear boundaries, appropriate tools, limited access, careful handling of sensitive information, and human review.
              </p>
            </div>
            <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full font-bold">
              Book a free consultation
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-14 md:py-16 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Bring the problem</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-4 max-w-4xl">
              Work on what has been sitting unresolved<span className="text-primary italic">.</span>
            </h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mb-8">
              Start with the real situation, not a generic lesson. The training is built around helping you use AI to move that problem forward—and know where to check its work.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map(([title, body], i) => (
              <Reveal key={title} delay={Math.min(i, 3) * 60} className="h-full">
                <div className="bg-surface p-5 rounded-3xl soft-lift h-full">
                  <div className="text-primary font-label font-bold text-sm mb-3">0{i + 1}</div>
                  <h3 className="font-headline text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-14 md:py-16 bg-ink text-inverse-on-surface">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">Trust, privacy &amp; security</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-4 max-w-4xl">Use AI without losing control<span className="text-primary italic">.</span></h2>
            <p className="text-base text-inverse-on-surface/70 max-w-2xl mb-8">
              We focus on practical safeguards for the tools and information involved in your work. No blanket promises—just clear decisions about what to use, who can access it, and what needs a person’s review.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRUST.map(([title, body], i) => (
              <Reveal key={title} delay={Math.min(i, 3) * 60} className="h-full">
                <div className="border border-inverse-on-surface/15 p-5 rounded-3xl h-full">
                  <div className="text-primary font-label font-bold text-sm mb-3">0{i + 1}</div>
                  <h3 className="font-headline text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-inverse-on-surface/70 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-14 md:py-16">
        <Reveal className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-6">Book a free consultation<span className="text-primary italic">.</span></h2>
          <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-7 py-4 rounded-full font-bold">
            Book a free consultation <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </Reveal>
      </section>
    </>
  );
}
