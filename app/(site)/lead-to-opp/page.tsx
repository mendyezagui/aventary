import Link from "next/link";

export const revalidate = 3600;

const OG_IMAGE = "https://aventary.com/og-insights.png";
const PAGE_URL = "https://aventary.com/lead-to-opp";
const TITLE = "The 6-Point Lead-to-Opportunity Framework | Aventary";
const DESCRIPTION =
  "How we took lead assignment from days to one minute. The operational framework built on a Fortune 500 Salesforce + Agentforce transformation, translated for Series A-C SaaS.";

export const metadata = {
  title: "Lead-to-Opportunity Framework",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "The 6-Point Lead-to-Opportunity Framework by Aventary"
      }
    ],
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE]
  }
};

const OUTCOMES = [
  { num: "Days → 1 min", label: "Lead-to-rep assignment latency" },
  { num: "2×", label: "Lead throughput, same rep capacity" },
  { num: "25%", label: "Reduction in lead-stage leakage" },
  { num: "2,500", label: "Backlog leads cleared to zero" }
];

const PAINS = [
  { strong: "3-day average response time.", body: "Most inbound went cold before a rep saw it." },
  { strong: "Routing built on hope.", body: "Round-robin to whoever was online, regardless of fit." },
  { strong: "25% leakage at the lead stage.", body: "Real prospects ghosted because nothing was working them." },
  { strong: "Forecast trust gone.", body: "Pipeline numbers nobody believed." }
];

const FRAMEWORK = [
  {
    num: "01",
    icon: "filter_alt",
    title: "Lead Classification",
    tagline: "Spam. Support. Real prospect.",
    body:
      "Inbound volume gets noisy fast at scale. Before scoring or routing, every lead gets classified: spam discarded, support routed to CS, real prospects passed forward. Reps never see the noise. This single step eliminated thousands of lead-hours per quarter from the rep workflow."
  },
  {
    num: "02",
    icon: "target",
    title: "Lead Scoring",
    tagline: "Propensity to convert, in real time.",
    body:
      "Score the lead on intent signal, fit, and engagement history. The score drives prioritization and timing, not just routing. Engage the right lead at the right time, not the lead that happened to fill the form most recently."
  },
  {
    num: "03",
    icon: "bolt",
    title: "Agentic Engagement",
    tagline: "Autonomous email and chat, 24/7.",
    body:
      "AI agents engage the lead immediately across email and chat, personalized to the lead's stated need and the company's playbook. Response time drops from days to minutes. The agent never sleeps. Reps see the full conversation history when they take over."
  },
  {
    num: "04",
    icon: "checklist",
    title: "BANT Qualification",
    tagline: "Budget. Authority. Need. Timeline.",
    body:
      "The AI checks CRM for existing BANT fields. If any are missing or weakly scored, those questions get woven into the next exchange with the lead naturally. Each element scores 0-3. Total above 8 out of 12 triggers conversion to opportunity and auto-scheduling with a rep."
  },
  {
    num: "05",
    icon: "handshake",
    title: "Human-in-the-Loop",
    tagline: "Seamless collaboration. Real escalation.",
    body:
      "When the AI hits a question it can't answer, or a lead crosses an escalation threshold, the rep is paged in real time with full context. No drop-off. No \"let me check with the team and get back to you.\" The handoff is the product."
  },
  {
    num: "06",
    icon: "hub",
    title: "AI-to-AI Coordination",
    tagline: "Intelligent handoffs across systems and agents.",
    body:
      "Classification, scoring, engagement, and qualification agents coordinate through a shared state. Each one knows what the others have done. No duplicate outreach, no contradictory messaging, no leads sitting in a queue waiting for a human trigger."
  }
];

const TIMELINE = [
  {
    label: "Weeks 1-3",
    title: "Foundation live",
    body:
      "Classification, scoring, and agentic engagement deployed against your existing Salesforce stack. First measurable drop in response latency."
  },
  {
    label: "Weeks 4-6",
    title: "Qualification + handoff",
    body:
      "BANT scoring loop and human-in-the-loop escalation wired in. Reps stop seeing unqualified leads. Forecast trust starts rebuilding."
  },
  {
    label: "Weeks 7-10",
    title: "Coordination + measurement",
    body:
      "AI-to-AI state sharing and the operational dashboard your CRO actually checks on Monday morning. Leakage rate becomes visible and addressable."
  }
];

export default function LeadToOppPage() {
  return (
    <>
      {/* HERO */}
      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
            <span className="material-symbols-outlined text-base">bolt</span>
            The Aventary Framework
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-bold editorial-gap leading-[1.05] mb-8 max-w-5xl">
            Lead-to-Opportunity, <span className="text-primary italic">days to one minute</span>.
          </h1>
          <p className="text-xl text-on-surface-variant max-w-3xl mb-10">
            A six-point operational framework for the way real RevOps teams actually convert
            inbound. Built inside a Fortune 500 Salesforce + Agentforce transformation. Adapted for
            Series A-C SaaS.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/appointments"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
            >
              Book a 30-min walkthrough
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href="#framework"
              className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-6 py-3 rounded-full font-bold soft-lift"
            >
              Read the framework
            </Link>
          </div>
        </div>
      </section>

      {/* OUTCOMES STRIP */}
      <section className="px-8 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {OUTCOMES.map((o) => (
            <div
              key={o.label}
              className="bg-surface-container-lowest p-8 rounded-3xl soft-lift relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-70" />
              <div className="font-headline text-3xl md:text-4xl font-bold leading-none mb-3">
                {o.num}
              </div>
              <div className="text-sm text-on-surface-variant leading-snug">{o.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SETUP */}
      <section className="px-8 py-20 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
              The Setup
            </div>
            <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
              Inbound was loud. Most of it shouldn&apos;t have been a rep&apos;s problem.
            </h2>
            <p className="text-lg text-on-surface-variant mb-5">
              Spam. Off-ICP form fills. Support questions routed wrong. Real prospects sitting in a
              queue for days because nobody could triage fast enough. Pipeline leakage at the lead
              stage was the silent killer of forecast accuracy.
            </p>
            <p className="text-lg text-on-surface-variant">
              The fix wasn&apos;t more reps. It wasn&apos;t a new tool. It was an{" "}
              <strong className="text-on-surface">operational architecture</strong> that let AI do
              the work no human will do at 9pm, and let humans focus on the conversations that
              close.
            </p>
          </div>
          <ul className="bg-surface p-2 rounded-3xl soft-lift list-none">
            {PAINS.map((p) => (
              <li
                key={p.strong}
                className="flex gap-4 p-5 border-b border-outline-variant last:border-b-0"
              >
                <span className="material-symbols-outlined text-error flex-shrink-0 mt-0.5">
                  cancel
                </span>
                <div>
                  <strong className="text-on-surface block">{p.strong}</strong>
                  <span className="text-on-surface-variant text-sm">{p.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FRAMEWORK */}
      <section id="framework" className="px-8 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            The Framework
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
            Six steps that compound when they run together
            <span className="text-primary italic">.</span>
          </h2>
          <p className="text-xl text-on-surface-variant max-w-3xl mb-14">
            AI doesn&apos;t replace humans. It amplifies their capacity to serve, engage, and
            convert. Each step is doable on its own. The leverage shows up when they coordinate.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {FRAMEWORK.map((f) => (
              <div
                key={f.num}
                className="bg-surface-container-lowest p-8 rounded-3xl soft-lift relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed font-label font-bold text-sm">
                    {f.num}
                  </span>
                  <div className="font-label font-bold text-xs tracking-widest uppercase text-primary">
                    Step {Number(f.num)}
                  </div>
                </div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container mb-5">
                  <span className="material-symbols-outlined text-on-primary-container">
                    {f.icon}
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-2">{f.title}</h3>
                <div className="text-on-surface-variant italic text-sm mb-4 font-headline">
                  {f.tagline}
                </div>
                <p className="text-on-surface-variant leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAPS TO YOUR STAGE */}
      <section className="px-8 py-24 bg-surface-container-lowest">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            What This Maps To At Your Stage
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
            The Fortune 500 build was multi-quarter. At Series A-C, it&apos;s{" "}
            <span className="text-primary italic">6 to 10 weeks</span>.
          </h2>
          <p className="text-lg text-on-surface-variant max-w-3xl mx-auto mb-14">
            The first three points typically go live inside the first three weeks. The reduction in
            lead-to-rep latency is usually the first visible result and the easiest win for a CRO to
            point at on the next board call.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            {TIMELINE.map((t) => (
              <div key={t.label} className="bg-surface p-8 rounded-3xl soft-lift">
                <div className="font-label font-bold text-xs tracking-widest uppercase text-primary mb-3">
                  {t.label}
                </div>
                <h4 className="font-headline text-xl font-bold mb-3">{t.title}</h4>
                <p className="text-on-surface-variant leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>

          {/* Author */}
          <div className="mt-16 bg-surface p-8 rounded-3xl soft-lift flex flex-col md:flex-row items-center gap-6 text-left">
            <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline text-2xl font-bold flex-shrink-0">
              M
            </div>
            <div>
              <div className="font-headline text-lg font-bold mb-1">
                Mendy Ezagui · Founder, Aventary
              </div>
              <div className="text-on-surface-variant text-sm leading-relaxed">
                Led the Lead-to-Opportunity workstream on a Fortune 500 Salesforce + Agentforce
                transformation at PwC. Now building Aventary, a boutique RevOps practice for Series
                A-C SaaS.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Talk Through Your Stack
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
            Which of the six points has the most leverage at your org
            <span className="text-primary italic">?</span>
          </h2>
          <p className="text-xl text-on-surface-variant mb-10">
            Book a 30-minute Zoom. No deck. No methodology lecture. Just your stack, your pain, and
            what would actually move the needle in the next quarter.
          </p>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-lg"
          >
            Book a 30-min walkthrough
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    </>
  );
}
