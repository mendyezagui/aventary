// Data model + scoring for the Aventary Operating Systems Diagnostic (/diagnostic).
// 8 domains × 3 questions, each answered on a 0–4 maturity scale.
// Pure functions here; UI state lives in components/DiagnosticApp.tsx.

export type ScaleOption = { value: number; label: string; hint: string };

// One consistent maturity scale used for every question.
export const SCALE: ScaleOption[] = [
  { value: 0, label: "Unknown / absent", hint: "No shared definition or evidence" },
  { value: 1, label: "Ad hoc", hint: "Depends on individuals or undocumented workarounds" },
  { value: 2, label: "Partially defined", hint: "Documented in places; inconsistent execution" },
  { value: 3, label: "Operational", hint: "Consistent execution with usable evidence" },
  { value: 4, label: "Managed & improving", hint: "Measured, owned, audited, and actively improved" }
];

export type Question = { id: string; text: string; example?: string };

export type Domain = {
  key: string;
  n: number;
  title: string;
  short: string; // radar/axis label
  questions: Question[];
};

export const DOMAINS: Domain[] = [
  {
    key: "outcome",
    n: 1,
    title: "Outcome clarity",
    short: "Outcomes",
    questions: [
      { id: "q1", text: "Is the intended business outcome explicitly defined?" },
      {
        id: "q2",
        text: "Can you distinguish attempted execution from completed outcome?",
        example: "Assigned vs. contacted, transferred vs. answered, closed vs. resolved."
      },
      { id: "q3", text: "Does the team agree on the evidence that proves success?" }
    ]
  },
  {
    key: "visibility",
    n: 2,
    title: "Workflow visibility",
    short: "Visibility",
    questions: [
      {
        id: "q4",
        text: "Is the real end-to-end workflow documented?",
        example: "Include manual work, spreadsheets, Slack, email, escalations, and workarounds."
      },
      { id: "q5", text: "Are decision rules and required context explicit?" },
      { id: "q6", text: "Does the documented workflow match how work is actually performed?" }
    ]
  },
  {
    key: "ownership",
    n: 3,
    title: "Ownership and handoffs",
    short: "Ownership",
    questions: [
      { id: "q7", text: "Does every material step have an accountable owner?" },
      { id: "q8", text: "Are handoff acceptance criteria defined?" },
      { id: "q9", text: "Does context survive handoffs without being recreated?" }
    ]
  },
  {
    key: "truth",
    n: 4,
    title: "System truth and data",
    short: "System truth",
    questions: [
      {
        id: "q10",
        text: "Is the authoritative system defined for each important claim?",
        example:
          "Identity, activity, transfer answer, resolution, opportunity stage, commercial signal."
      },
      { id: "q11", text: "Is decision-critical data trusted by the people using it?" },
      { id: "q12", text: "Are identities and records reliably matched across systems?" }
    ]
  },
  {
    key: "exceptions",
    n: 5,
    title: "Exceptions and controls",
    short: "Exceptions",
    questions: [
      { id: "q13", text: "Do common exceptions have designed paths?" },
      { id: "q14", text: "Are duplicate, unsafe, or contradictory actions prevented?" },
      {
        id: "q15",
        text: "When a workflow fails, is evidence preserved and routed to the correct owner?"
      }
    ]
  },
  {
    key: "harness",
    n: 6,
    title: "AI and automation harness",
    short: "AI harness",
    questions: [
      { id: "q16", text: "Are AI decision rights and boundaries explicit?" },
      { id: "q17", text: "Do system actions use validated, deterministic tools?" },
      { id: "q18", text: "Are human review, fallback, monitoring, and cost controls in place?" }
    ]
  },
  {
    key: "measurement",
    n: 7,
    title: "Measurement and learning",
    short: "Measurement",
    questions: [
      {
        id: "q19",
        text: "Do you measure friction alongside throughput?",
        example:
          "Repeats, callbacks, reassignments, waiting, stage reversals, intervention, and rework."
      },
      {
        id: "q20",
        text: "Does each important metric lead to a decision?",
        example: "The decision should be one of: build, fix, remove, escalate, or monitor."
      },
      { id: "q21", text: "Does production evidence reliably become the improvement backlog?" }
    ]
  },
  {
    key: "revops",
    n: 8,
    title: "RevOps and service signals",
    short: "RevOps signals",
    questions: [
      {
        id: "q22",
        text:
          "Are revenue signals coalesced across marketing, sales, service, support, product, and events?"
      },
      {
        id: "q23",
        text: "Do service interactions influence account actions when commercially relevant?"
      },
      {
        id: "q24",
        text: "Do your stages, cohorts, attribution, and KPIs reflect current buyer behavior?"
      }
    ]
  }
];

export const TOTAL_QUESTIONS = DOMAINS.reduce((n, d) => n + d.questions.length, 0);

export type MaturityBand = {
  key: string;
  min: number;
  max: number;
  label: string;
  blurb: string;
};

export const MATURITY: MaturityBand[] = [
  { key: "fragile", min: 0, max: 24, label: "Fragile", blurb: "The operating system is mostly implicit." },
  { key: "reactive", min: 25, max: 49, label: "Reactive", blurb: "Core processes exist but depend on people and workarounds." },
  { key: "operational", min: 50, max: 69, label: "Operational", blurb: "The business runs, but friction is not systematically converted into improvement." },
  { key: "instrumented", min: 70, max: 84, label: "Instrumented", blurb: "Evidence and controls exist; the next opportunity is faster cross-functional learning." },
  { key: "adaptive", min: 85, max: 100, label: "Adaptive", blurb: "The system is auditable, measured, and continuously redesigned from production evidence." }
];

export function bandFor(score: number): MaturityBand {
  return MATURITY.find((b) => score >= b.min && score <= b.max) ?? MATURITY[0];
}

// Engagement tier keyed off the overall score.
export const ENGAGEMENT: { min: number; max: number; label: string }[] = [
  { min: 0, max: 24, label: "Operating System Mapping" },
  { min: 25, max: 49, label: "Diagnostic + Workflow Redesign" },
  { min: 50, max: 69, label: "Instrumentation + Control Build" },
  { min: 70, max: 84, label: "AI / Automation Scaling" },
  { min: 85, max: 100, label: "Continuous Improvement Partnership" }
];

export function engagementFor(score: number): string {
  return (ENGAGEMENT.find((e) => score >= e.min && score <= e.max) ?? ENGAGEMENT[0]).label;
}

// Per-domain diagnosis + recommended next step when that domain is the weakest.
export const RECOMMENDATIONS: Record<
  string,
  { diagnosis: string; nextStep: string; link?: { href: string; label: string } }
> = {
  outcome: {
    diagnosis: "The system is measuring activity without a shared definition of success.",
    nextStep: "Define outcome evidence and rebuild reporting around completion, not attempts."
  },
  visibility: {
    diagnosis: "The documented process does not reflect the operation people actually run.",
    nextStep: "Map the real end-to-end workflow, including exceptions and workarounds."
  },
  ownership: {
    diagnosis:
      "Value is leaking between teams because acceptance, context, and accountability are unclear.",
    nextStep:
      "Redesign the highest-value handoff and instrument repeat work, reassignments, and waiting time."
  },
  truth: {
    diagnosis: "Systems are producing activity, but the company lacks trusted evidence for decisions.",
    nextStep:
      "Define authoritative systems by claim and repair identity, matching, and evidence boundaries."
  },
  exceptions: {
    diagnosis:
      "The normal path works, but uncertainty creates unsafe workarounds and manual intervention.",
    nextStep: "Design the top exception paths, duplicate guards, escalation rules, and failure evidence."
  },
  harness: {
    diagnosis:
      "AI or automation is executing without sufficient boundaries, validation, fallback, or operational ownership.",
    nextStep: "Run The Harness Audit and redesign the production controls around the highest-risk workflow.",
    link: { href: "/insights/the-harness-audit", label: "Read The Harness Audit" }
  },
  measurement: {
    diagnosis: "Metrics report performance but do not tell the organization what to change.",
    nextStep:
      "Add friction metrics and connect each one to build, fix, remove, escalate, or monitor decisions."
  },
  revops: {
    diagnosis: "Commercial signals are fragmented across teams, channels, and systems.",
    nextStep: "Build one cross-functional signal loop from detection through owned action and outcome evidence."
  }
};

export type DomainResult = { key: string; title: string; short: string; score: number };

export type DiagnosticResult = {
  overall: number;
  band: MaturityBand;
  engagement: string;
  domains: DomainResult[];
  weakest: DomainResult;
  secondWeakest: DomainResult;
};

/**
 * Score the answers map (question id -> 0..4). Missing answers count as 0 so a
 * partial run still resolves, but the UI requires all 24 before showing results.
 */
export function scoreDiagnostic(answers: Record<string, number>): DiagnosticResult {
  const domains: DomainResult[] = DOMAINS.map((d) => {
    const sum = d.questions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    const score = Math.round((sum / (d.questions.length * 4)) * 100);
    return { key: d.key, title: d.title, short: d.short, score };
  });

  const totalSum = DOMAINS.reduce(
    (acc, d) => acc + d.questions.reduce((a, q) => a + (answers[q.id] ?? 0), 0),
    0
  );
  const overall = Math.round((totalSum / (TOTAL_QUESTIONS * 4)) * 100);

  // Weakest = lowest score; stable order by DOMAINS sequence on ties.
  const ranked = [...domains].sort((a, b) => a.score - b.score);

  return {
    overall,
    band: bandFor(overall),
    engagement: engagementFor(overall),
    domains,
    weakest: ranked[0],
    secondWeakest: ranked[1]
  };
}
