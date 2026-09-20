import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/training";
const TITLE = "Executive & Leadership AI Training | Aventary";
const DESCRIPTION =
  "Practical AI training for executives, leadership teams, operators, and privacy-sensitive organizations. Learn AI by solving the work that is stuck.";

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
  {
    num: "01",
    icon: "school",
    title: "Understand",
    sub: "Build a clear foundation.",
    body:
      "Learn what modern AI tools can and cannot do, how useful context changes an output, and how to verify important answers before acting on them.",
    output: "A practical mental model for using AI with judgment."
  },
  {
    num: "02",
    icon: "target",
    title: "Apply",
    sub: "Find the opportunities in the real work.",
    body:
      "Identify the recurring tasks, documents, research, decisions, and information bottlenecks where AI could create useful leverage inside your organization.",
    output: "A short list of relevant, worthwhile use cases."
  },
  {
    num: "03",
    icon: "build",
    title: "Solve",
    sub: "Work through the problem that matters.",
    body:
      "Use the participant's actual workflow and information to move a stuck problem forward—without pretending that every task should be automated.",
    output: "A working approach connected to a real business outcome."
  },
  {
    num: "04",
    icon: "autorenew",
    title: "Repeat",
    sub: "Leave with capability, not dependence.",
    body:
      "Turn what worked into reusable prompts, review habits, and workflows people can adapt to the next problem themselves.",
    output: "A repeatable way to find and solve the next opportunity."
  }
];

const DIFFERENT = [
  {
    icon: "psychology",
    title: "Fundamentals without the fog",
    body: "Start with understandable concepts and useful habits—not jargon, hype, or a tour of features nobody will use."
  },
  {
    icon: "work_history",
    title: "The work is the curriculum",
    body: "Training moves quickly from principles into the participant's documents, workflows, research, decisions, and recurring tasks."
  },
  {
    icon: "engineering",
    title: "No engineering background required",
    body: "Executives and operators can learn to use AI effectively without becoming developers or outsourcing their judgment."
  },
  {
    icon: "rule",
    title: "Human accountability stays clear",
    body: "AI can help people think and execute faster. The person responsible still reviews, decides, and owns the result."
  }
];

const USE_CASES = [
  ["Research and synthesis", "Turn scattered reading and source material into a useful brief, comparison, or set of questions."],
  ["Document-heavy work", "Read, identify, classify, rename, and organize large collections of files with appropriate human review."],
  ["Executive briefings", "Prepare concise context for a meeting, decision, board discussion, or operating review."],
  ["Information retrieval", "Find and organize information from approved sources such as documents, email, and shared drives."],
  ["Recurring communications", "Create better drafts, follow-ups, summaries, and responses while keeping voice and approval with the team."],
  ["Decision preparation", "Surface relevant facts, contradictions, unknowns, and next questions before a leader makes a call."]
];

const OPTIONS = [
  { icon: "person", title: "Executive one-on-one", body: "Focused coaching around one leader's actual responsibilities, decisions, information, and working style." },
  { icon: "groups", title: "Leadership team sessions", body: "A shared foundation followed by practical use-case discovery, team norms, and work on a priority problem." },
  { icon: "co_present", title: "Team workshops", body: "Hands-on training for a group using role-specific workflows, examples, templates, and review habits." },
  { icon: "follow_the_signs", title: "Ongoing advisory", body: "Follow-up sessions to review what people tried, improve the workflows, and identify the next useful experiment." }
];

const TRUST = [
  ["Information boundaries", "Start by identifying what information is involved, what is sensitive, and what should remain outside a particular workflow."],
  ["Appropriate environments", "Evaluate which AI environment and account configuration fit the organization's requirements rather than assuming one tool is right for every use case."],
  ["Access controls and handling", "Consider who is authorized to access the information, minimum necessary access, data handling, and data retention."],
  ["Human verification and review", "Define where facts must be checked, outputs verified and approved, and legal, financial, client, or family-office judgment kept with a responsible person."],
  ["Requirements first", "Aventary helps clients evaluate tools and workflows against their own security, privacy, governance, and operating requirements."],
  ["Honest limits", "AI can be wrong. Training includes uncertainty, verification, and escalation habits instead of blanket promises about safety or retention."]
];

const AUDIENCE = [
  "Executives",
  "Leadership teams",
  "Family offices",
  "Information-heavy operators",
  "Teams with recurring work",
  "Organizations with stuck problems"
];

export default function TrainingPage() {
  return (
    <>
      <section className="px-6 md:px-8 pt-32 md:pt-44 pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-10">
            <span className="material-symbols-outlined text-base">school</span>
            Executive &amp; Leadership AI Training
          </div>
          <h1 className="font-headline text-5xl md:text-7xl lg:text-[5.5rem] font-bold editorial-gap leading-[1.02] mb-10 max-w-5xl">
            Learn AI by solving the work that&apos;s been <span className="text-primary italic">stuck.</span>
          </h1>
          <p className="text-xl md:text-2xl text-on-surface-variant max-w-3xl mb-12 leading-relaxed">
            Aventary trains executives, leadership teams, operators, and privacy-sensitive organizations using their real work—not generic AI demos. Start with the fundamentals, then apply them to the work that matters.
          </p>
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
      </section>

      <section className="px-6 md:px-8 pb-24 md:pb-32">
        <Reveal className="max-w-4xl mx-auto">
          <p className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.18]">
            Not another AI seminar. <span className="text-primary italic">A working session</span> with the problems your people already need to solve.
          </p>
        </Reveal>
      </section>

      <section className="px-6 md:px-8 py-24 md:py-32 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Why this training is different</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.05] mb-16 max-w-3xl">The point is not to know more about AI. It&apos;s to do more with it<span className="text-primary italic">.</span></h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            {DIFFERENT.map((item, i) => (
              <Reveal key={item.title} delay={i * 70} className="h-full">
                <div className="bg-surface p-8 rounded-3xl soft-lift h-full">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container mb-5"><span className="material-symbols-outlined text-on-primary-container">{item.icon}</span></div>
                  <h3 className="font-headline text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="journey" className="px-6 md:px-8 py-24 md:py-32 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">How the training works</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.05] mb-6">Understand. Apply. Solve. Repeat<span className="text-primary italic">.</span></h2>
            <p className="text-xl text-on-surface-variant max-w-3xl mb-16">A simple journey from AI fundamentals to independent capability, built around the work in front of you.</p>
          </Reveal>
          <div className="space-y-6">
            {JOURNEY.map((step, i) => (
              <Reveal key={step.num} delay={Math.min(i, 3) * 70}>
                <div className="bg-surface-container-lowest rounded-3xl soft-lift p-8 md:p-12 grid md:grid-cols-[7rem_1fr] gap-6 md:gap-10">
                  <div className="flex md:flex-col items-center md:items-start gap-4"><div className="font-headline text-6xl md:text-7xl font-bold text-primary leading-none">{step.num}</div><div className="material-symbols-outlined text-primary text-3xl">{step.icon}</div></div>
                  <div><h3 className="font-headline text-2xl md:text-3xl font-bold mb-1">{step.title}</h3><div className="text-on-surface-variant italic font-headline mb-5">{step.sub}</div><p className="text-on-surface-variant leading-relaxed mb-5">{step.body}</p><div className="font-label text-sm font-bold text-accent">Output: {step.output}</div></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-24 md:py-32 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <Reveal><div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Executive use cases</div><h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.05] mb-6">Make the work clearer<span className="text-primary italic">.</span></h2><p className="text-xl text-on-surface-variant max-w-3xl mb-16">The best starting point is usually a real bottleneck—not a category of software.</p></Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_CASES.map(([title, body], i) => <Reveal key={title} delay={Math.min(i, 3) * 70} className="h-full"><div className="bg-surface p-8 rounded-3xl soft-lift h-full"><div className="text-primary font-label font-bold text-sm mb-5">0{i + 1}</div><h3 className="font-headline text-2xl font-bold mb-3">{title}</h3><p className="text-on-surface-variant leading-relaxed">{body}</p></div></Reveal>)}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-24 md:py-32">
        <div className="max-w-7xl mx-auto"><Reveal><div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Training options</div><h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.05] mb-6">Choose the format that fits the work<span className="text-primary italic">.</span></h2><p className="text-xl text-on-surface-variant max-w-3xl mb-16">The format can be tailored to the people, problem, and pace of the organization.</p></Reveal><div className="grid md:grid-cols-2 gap-6">{OPTIONS.map((item, i) => <Reveal key={item.title} delay={i * 70} className="h-full"><div className="bg-surface-container-lowest p-8 rounded-3xl soft-lift h-full"><span className="material-symbols-outlined text-primary text-3xl mb-5">{item.icon}</span><h3 className="font-headline text-2xl font-bold mb-3">{item.title}</h3><p className="text-on-surface-variant leading-relaxed">{item.body}</p></div></Reveal>)}</div></div>
      </section>

      <section className="px-6 md:px-8 py-24 md:py-32 bg-ink text-inverse-on-surface">
        <div className="max-w-7xl mx-auto"><Reveal><div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">Privacy, security &amp; trust</div><h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.05] mb-6 max-w-4xl">Use AI with clearer boundaries<span className="text-primary italic">.</span></h2><p className="text-xl text-inverse-on-surface/70 max-w-3xl mb-16">Responsible use starts with the information, people, and decisions around a workflow—not with a blanket claim about any provider.</p></Reveal><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{TRUST.map(([title, body], i) => <Reveal key={title} delay={Math.min(i, 3) * 70} className="h-full"><div className="border border-inverse-on-surface/15 p-8 rounded-3xl h-full"><div className="text-primary font-label font-bold text-sm mb-5">0{i + 1}</div><h3 className="font-headline text-2xl font-bold mb-3">{title}</h3><p className="text-inverse-on-surface/70 leading-relaxed">{body}</p></div></Reveal>)}</div></div>
      </section>

      <section className="px-6 md:px-8 py-24 md:py-32"><Reveal className="max-w-5xl mx-auto text-center"><div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Who this is for</div><h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.05] mb-12">For people responsible for the work<span className="text-primary italic">.</span></h2><div className="flex flex-wrap justify-center gap-3">{AUDIENCE.map((item) => <span key={item} className="px-5 py-3 rounded-full bg-surface-container-lowest font-label text-sm">{item}</span>)}</div></Reveal></section>

      <section className="px-6 md:px-8 py-28 md:py-36 bg-ink text-inverse-on-surface"><Reveal className="max-w-3xl mx-auto text-center"><div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">Start with the work</div><h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.05] mb-8">Bring a problem that is still stuck<span className="text-primary italic">.</span></h2><p className="text-xl text-inverse-on-surface/70 leading-relaxed mb-10">We will help you determine whether AI can move it forward, what information and review it requires, and what a sensible first step looks like.</p><Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-7 py-4 rounded-full font-bold">Book an AI working session <span className="material-symbols-outlined">arrow_forward</span></Link></Reveal></section>
    </>
  );
}
