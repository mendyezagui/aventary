import Link from "next/link";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/method";
const OG_IMAGE = "https://aventary.com/og-method.png";
const TITLE = "The Aventary Method | Aventary";
const DESCRIPTION =
  "A practical operating method for finding where work, context, ownership, and revenue leak, then building the next capability that closes the gap.";

export const metadata = {
  title: "The Aventary Method",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "The Aventary Method" }],
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE]
  }
};

type Step = {
  num: string;
  icon: string;
  title: string;
  sub: string;
  body: string;
  listLabel?: string;
  list?: string[];
  ordered?: boolean;
  pull?: string;
  output: string;
};

const METHOD: Step[] = [
  {
    num: "01",
    icon: "visibility",
    title: "Observe",
    sub: "Study the work people actually do.",
    body:
      "We start with the real workflow, not the flowchart someone drew two years ago. The spreadsheets, the Slack threads, the manual fixes, the escalations, and the exceptions nobody wrote down.",
    listLabel: "We look for",
    list: [
      "Where work begins",
      "Who touches it",
      "Where decisions happen",
      "What information is required",
      "Where people leave the system to get it done",
      "Which exceptions eat the most time"
    ],
    output: "A clear operating narrative and a first set of failure hypotheses."
  },
  {
    num: "02",
    icon: "monitoring",
    title: "Instrument",
    sub: "Capture the evidence, not just the activity.",
    body:
      "Most systems produce activity. Very few produce proof. We define which events actually matter, where the authoritative record for each one lives, and what has to be measured across Salesforce, AI platforms, automation, telephony, service, and collaboration tools.",
    listLabel: "We instrument",
    list: [
      "Handoffs",
      "Reassignments",
      "Repeated work",
      "Callbacks and repeat contacts",
      "Stage reversals",
      "Waiting time",
      "Exceptions",
      "Human intervention",
      "Outcome completion"
    ],
    output: "Evidence boundaries, a baseline, and a measurement plan."
  },
  {
    num: "03",
    icon: "troubleshoot",
    title: "Diagnose",
    sub: "Separate the symptom from the cause.",
    body:
      'A low conversion rate can be a routing problem. A forecast miss can be a stage-definition problem. An "AI failure" is often missing context, weak validation, or a human handoff that dropped the ball.',
    listLabel: "We diagnose",
    list: [
      "Broken ownership",
      "Weak handoffs",
      "Untrusted data",
      "Missing controls",
      "Incomplete workflows",
      "Misleading metrics",
      "AI and automation gaps",
      "Revenue and service signal loss"
    ],
    output: "A prioritized friction map and a quantified opportunity."
  },
  {
    num: "04",
    icon: "architecture",
    title: "Design",
    sub: "Define the smallest complete loop.",
    body:
      "Aventary does not start with a giant transformation roadmap. We design the smallest complete loop that can move one business outcome from trigger to evidence.",
    listLabel: "A complete loop includes",
    ordered: true,
    list: [
      "A real business trigger",
      "Trusted context",
      "Classification",
      "A decision",
      "Execution",
      "A durable record",
      "Evidence of the outcome",
      "Exception handling",
      "Measurement",
      "A feedback path"
    ],
    output: "Target operating model, decision rules, controls, and a build backlog."
  },
  {
    num: "05",
    icon: "rocket_launch",
    title: "Deploy",
    sub: "Put the capability into production.",
    body:
      "We implement the workflow, integration, Salesforce changes, AI behavior, validation, review gates, and human paths required to make the loop actually run.",
    listLabel: "Deployment may include",
    list: [
      "Salesforce workflow and data-model changes",
      "Lead routing and SLA controls",
      "Agentforce or voice-AI workflows",
      "n8n or integration orchestration",
      "Service-to-revenue signal routing",
      "Exception and escalation paths",
      "Executive scorecards",
      "Production evidence capture"
    ],
    output: "A production capability with auditable execution."
  },
  {
    num: "06",
    icon: "autorenew",
    title: "Improve",
    sub: "Turn production friction into the next build.",
    body:
      "Go-live only proves the system can run. Production tells you whether it works. We use real behavior to decide what to build, fix, remove, escalate, or watch.",
    pull: "The metrics become the backlog.",
    output: "A continuous operating-improvement cycle and the next release plan."
  }
];

const DIFF = [
  {
    icon: "swap_horiz",
    title: "Handoffs as products",
    body:
      "A handoff only succeeds when the next person or system gets enough trusted context to keep going without recreating the work. We treat every handoff as a product with a spec, not a courtesy pass."
  },
  {
    icon: "fact_check",
    title: "Evidence boundaries",
    body:
      "Salesforce, AI, automation, telephony, Slack, and messaging each prove different claims. A transfer attempt is not proof a human answered. We define which system is authoritative for each fact, so nobody argues over numbers that were never measured the same way."
  },
  {
    icon: "query_stats",
    title: "Metrics that create decisions",
    body:
      "A dashboard should tell you the next workflow, integration, control, or capability to build. If it only explains last quarter, it is a report, not an operating system."
  },
  {
    icon: "smart_toy",
    title: "AI with a harness",
    body:
      "Production AI needs decision rights, trusted context, deterministic tools, validation, review gates, fallback paths, monitoring, and a clear owner. Without the harness, you have a demo, not a system."
  },
  {
    icon: "target",
    title: "Outcomes over activity",
    body:
      "Assignment is not engagement. We measure whether the intended business outcome actually happened, not whether a step got logged."
  }
];

const APPLIES = [
  "RevOps and lead-to-opportunity systems",
  "Salesforce operating-model redesign",
  "Service and support workflows",
  "AI and automation deployment",
  "Voice-AI operations",
  "Executive metrics and operating reviews",
  "Product and technology roadmaps"
];

export default function MethodPage() {
  return (
    <>
      {/* HERO */}
      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
            <span className="material-symbols-outlined text-base">conversion_path</span>
            The Aventary Method
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold editorial-gap leading-[1.08] mb-8 max-w-5xl">
            Make the work visible.{" "}
            <span className="text-primary italic">Make the failures measurable.</span> Build the
            next capability.
          </h1>
          <p className="text-xl text-on-surface-variant max-w-3xl mb-10">
            Before you buy another tool, look at how work actually moves through your company. It
            crosses teams, jumps between systems, and sheds context at every handoff. By the time a
            dashboard tells you something broke, the value already leaked out the side.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/diagnostic"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
            >
              Run the diagnostic
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href="/appointments"
              className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-6 py-3 rounded-full font-bold soft-lift"
            >
              Book a working session
            </Link>
          </div>
        </div>
      </section>

      {/* PREMISE */}
      <section className="px-8 pb-8">
        <div className="max-w-3xl mx-auto">
          <p className="font-headline text-2xl md:text-3xl font-bold leading-[1.25]">
            That is an operating problem, not a technology problem. Aventary has a{" "}
            <span className="text-primary italic">six-step method</span> for finding it, proving it
            with evidence, and turning it into something you can build.
          </p>
        </div>
      </section>

      {/* THE METHOD RAIL */}
      <section id="method" className="px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">
            The Method
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-14">
            Six steps, from the real work to the next build
            <span className="text-primary italic">.</span>
          </h2>

          <div className="space-y-6">
            {METHOD.map((s) => (
              <div
                key={s.num}
                className="bg-surface-container-lowest rounded-3xl soft-lift p-8 md:p-10 grid md:grid-cols-[7rem_1fr] gap-6 md:gap-10"
              >
                {/* Number + icon */}
                <div className="flex md:flex-col items-center md:items-start gap-4">
                  <div className="font-headline text-5xl md:text-6xl font-bold text-primary leading-none">
                    {s.num}
                  </div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container">
                    <span className="material-symbols-outlined text-on-primary-container">
                      {s.icon}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-headline text-2xl md:text-3xl font-bold mb-1">{s.title}</h3>
                  <div className="text-on-surface-variant italic font-headline mb-5">{s.sub}</div>
                  <p className="text-on-surface-variant leading-relaxed max-w-2xl">{s.body}</p>

                  {s.pull ? (
                    <p className="font-headline text-2xl font-bold text-primary italic mt-6">
                      {s.pull}
                    </p>
                  ) : null}

                  {s.list && s.list.length ? (
                    <div className="mt-6">
                      <div className="font-label font-bold text-[11px] tracking-widest uppercase text-accent mb-3">
                        {s.listLabel}
                      </div>
                      <ul
                        className={`grid sm:grid-cols-2 gap-x-8 gap-y-2 ${
                          s.ordered ? "list-none" : "list-none"
                        }`}
                      >
                        {s.list.map((item, i) => (
                          <li key={item} className="flex gap-2.5 text-on-surface-variant text-sm">
                            <span className="text-primary font-label font-bold text-xs mt-0.5 tabular-nums w-4 flex-shrink-0">
                              {s.ordered ? `${i + 1}.` : "—"}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-7 inline-flex items-start gap-2.5 rounded-2xl bg-surface-container-high px-4 py-3">
                    <span className="font-label font-bold text-[11px] tracking-widest uppercase text-accent mt-0.5 flex-shrink-0">
                      Output
                    </span>
                    <span className="text-on-surface text-sm leading-snug">{s.output}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section className="px-8 py-24 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">
            What Makes the Method Different
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-14 max-w-3xl">
            Most of the value is in the parts other people skip
            <span className="text-primary italic">.</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DIFF.map((d) => (
              <div key={d.title} className="bg-surface p-8 rounded-3xl soft-lift">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container mb-5">
                  <span className="material-symbols-outlined text-on-primary-container">
                    {d.icon}
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{d.title}</h3>
                <p className="text-on-surface-variant leading-relaxed text-[15px]">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPLIES */}
      <section className="px-8 py-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">
            Where Aventary Applies the Method
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-12">
            One method, wherever the operation leaks
            <span className="text-primary italic">.</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {APPLIES.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-5 py-3 rounded-full soft-lift text-sm font-label font-semibold"
              >
                <span className="material-symbols-outlined text-primary text-base">check</span>
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 bg-ink text-inverse-on-surface">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Start With One Conversation
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
            We map where your operating system is leaking
            <span className="text-primary italic">.</span>
          </h2>
          <p className="text-xl text-white/70 mb-10">
            Book a focused working session. No slides, no pitch. We find where value is leaking
            across outcomes, ownership, handoffs, system truth, exceptions, AI controls, and
            measurement, and we name the next step.
          </p>
          <Link
            href="/appointments"
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
