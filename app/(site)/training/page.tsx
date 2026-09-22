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

const JOURNEY = [
  ["01", "Understand", "Learn what AI can do, where it fails, and how to verify important outputs."],
  ["02", "Apply", "Find useful opportunities in the documents, decisions, and recurring work already in front of you."],
  ["03", "Solve", "Use a real workflow to move a meaningful problem forward, without automating judgment."],
  ["04", "Repeat", "Keep the prompts, review habits, and workflow that make the next problem easier." ]
];

const USE_CASES = [
  ["Start the day", "Gather outstanding work across approved information sources, prioritize tasks, suggest next steps, and plan the day or week."],
  ["Research and briefs", "Turn source material into concise context, comparisons, questions, and decision support."],
  ["Documents and retrieval", "Find, organize, summarize, and classify information with appropriate human review."],
  ["Communication", "Draft follow-ups, summaries, and responses while people keep voice and approval."],
  ["Decision preparation", "Surface relevant facts, contradictions, unknowns, and next questions before a call."],
  ["Recurring workflows", "Build repeatable approaches around the work that consumes time every week."]
];

const TRUST = [
  ["Boundaries", "Establish what information is involved, what is sensitive, and what stays outside a workflow."],
  ["Environment", "Choose an appropriate business or enterprise AI environment for the sensitivity of the work."],
  ["Access", "Control permissions and use only the access needed for the task."],
  ["Retention", "Understand and choose data-retention settings that fit the organization's requirements."],
  ["Exposure", "Minimize unnecessary sensitive-data exposure and define where outputs need checking."],
  ["Human review", "Require verification and responsible human approval for consequential work."]
];

const FORMATS = [
  ["One-on-one", "Focused coaching around one leader's real responsibilities and decisions."],
  ["Leadership team", "A shared foundation, team norms, and work on a priority problem."],
  ["Team workshop", "Hands-on practice with role-specific workflows, examples, and review habits."],
  ["Ongoing advisory", "Follow-up to improve what people tried and choose the next useful experiment."]
];

export default function TrainingPage() {
  return (
    <>
      <section className="px-6 md:px-8 pt-20 md:pt-28 pb-14 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-5xl">
            <h1 className="font-headline text-5xl md:text-7xl lg:text-[6rem] font-bold leading-[.96] text-accent mb-5">
              Executive &amp; Leadership AI Training
            </h1>
            <h2 className="font-headline text-3xl md:text-5xl lg:text-[4rem] font-bold leading-[1] mb-5">
              Practical AI for <span className="text-primary italic">real work.</span>
            </h2>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-7 leading-relaxed">
              Learn AI by solving the work that is stuck—not by sitting through generic demos.
            </p>
            <div className="border-y border-outline-variant/40 py-4 mb-7 max-w-3xl">
              <div className="font-label font-bold text-sm tracking-widest mb-2">TRUST. PRIVACY. SECURITY.</div>
              <p className="text-sm md:text-base text-on-surface-variant">
                Set information boundaries, choose an appropriate environment, control access, understand retention, minimize exposure, and keep human review for consequential work.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full font-bold">
                Book an AI working session
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link href="#journey" className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-6 py-3.5 rounded-full font-bold soft-lift">
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="journey" className="px-6 md:px-8 py-16 md:py-20 bg-surface-container-lowest scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">The approach</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-4">Understand. Apply. Solve. Repeat<span className="text-primary italic">.</span></h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mb-10">A short path from fundamentals to independent capability, built around the work in front of you.</p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {JOURNEY.map(([num, title, body], i) => (
              <Reveal key={num} delay={i * 60} className="h-full">
                <div className="bg-surface p-6 rounded-3xl soft-lift h-full">
                  <div className="text-primary font-headline text-5xl font-bold leading-none mb-5">{num}</div>
                  <h3 className="font-headline text-2xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-16 md:py-20">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Executive use cases</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-10">Make the work clearer<span className="text-primary italic">.</span></h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map(([title, body], i) => (
              <Reveal key={title} delay={Math.min(i, 3) * 60} className="h-full">
                <div className="bg-surface-container-lowest p-6 rounded-3xl soft-lift h-full">
                  <div className="text-primary font-label font-bold text-sm mb-4">0{i + 1}</div>
                  <h3 className="font-headline text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-16 md:py-20 bg-ink text-inverse-on-surface">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">Trust, privacy &amp; security</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-4 max-w-4xl">Clear boundaries for useful AI<span className="text-primary italic">.</span></h2>
            <p className="text-base text-inverse-on-surface/70 max-w-2xl mb-10">Aventary helps clients make choices based on the work and its requirements—not blanket claims about any provider.</p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRUST.map(([title, body], i) => (
              <Reveal key={title} delay={Math.min(i, 3) * 60} className="h-full">
                <div className="border border-inverse-on-surface/15 p-6 rounded-3xl h-full">
                  <div className="text-primary font-label font-bold text-sm mb-4">0{i + 1}</div>
                  <h3 className="font-headline text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-inverse-on-surface/70 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-16 md:py-20">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Training formats</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-10">Choose the format that fits<span className="text-primary italic">.</span></h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FORMATS.map(([title, body], i) => (
              <Reveal key={title} delay={i * 60} className="h-full">
                <div className="bg-surface-container-lowest p-6 rounded-3xl soft-lift h-full">
                  <h3 className="font-headline text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-20 md:py-24 bg-ink text-inverse-on-surface">
        <Reveal className="max-w-3xl mx-auto text-center">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">Start with the work</div>
          <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-6">Bring a problem that is still stuck<span className="text-primary italic">.</span></h2>
          <p className="text-base text-inverse-on-surface/70 leading-relaxed mb-8">We will identify a sensible first step, the information it requires, and where review belongs.</p>
          <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-7 py-4 rounded-full font-bold">
            Book an AI working session <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </Reveal>
      </section>
    </>
  );
}
