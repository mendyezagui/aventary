// Data model + scoring for the Aventary Operating Systems Diagnostic (/diagnostic).
// 8 areas × 3 questions, each answered on a 0–4 scale.
// Language is written for a revenue leader / founder at a non-technical company,
// NOT an ops engineer — plain business framing, no systems jargon.
// Pure functions here; UI state lives in components/DiagnosticApp.tsx.

export type ScaleOption = { value: number; label: string; hint: string };

// One consistent scale used for every question — plain, human, no maturity-model jargon.
export const SCALE: ScaleOption[] = [
  { value: 0, label: "No, not really", hint: "We don't do this, or nobody agrees on it" },
  { value: 1, label: "Depends who's doing it", hint: "It happens, but it rides on specific people" },
  { value: 2, label: "Sometimes", hint: "In places, but not consistently" },
  { value: 3, label: "Mostly, consistently", hint: "It works the same way across the team" },
  { value: 4, label: "Yes, and we keep tightening it", hint: "It's measured, owned, and we keep improving it" }
];

export type Question = { id: string; text: string; example?: string };

export type Domain = {
  key: string;
  n: number;
  title: string;
  short: string; // radar/axis label — keep short
  questions: Question[];
};

export const DOMAINS: Domain[] = [
  {
    key: "outcome",
    n: 1,
    title: "Results, not activity",
    short: "Results",
    questions: [
      { id: "q1", text: "Is everyone clear on what a real “win” looks like for this part of the business?" },
      {
        id: "q2",
        text: "Can you tell the difference between people going through the motions and the result actually happening?",
        example: "A lead assigned vs. actually contacted. A call transferred vs. actually answered. A deal “closed” vs. the customer actually up and running."
      },
      { id: "q3", text: "Would your team point to the same proof that something actually worked?" }
    ]
  },
  {
    key: "visibility",
    n: 2,
    title: "How the work really happens",
    short: "The process",
    questions: [
      {
        id: "q4",
        text: "Do you actually know how the work gets done day to day — including the spreadsheets, Slack messages, and workarounds?"
      },
      { id: "q5", text: "Is it clear who decides what, and what information they need to make the call?" },
      { id: "q6", text: "Does the “official” process match what your team really does, or is there a gap?" }
    ]
  },
  {
    key: "ownership",
    n: 3,
    title: "Handoffs between teams",
    short: "Handoffs",
    questions: [
      { id: "q7", text: "Does every important step have a clear owner — no “I thought someone else had it”?" },
      {
        id: "q8",
        text: "When work passes between teams, is it clear what “ready to hand off” actually means?",
        example: "Marketing → sales, SDR → AE, sales → customer success."
      },
      {
        id: "q9",
        text: "When a lead or account changes hands, does the next person get the full story — or start from scratch and make the customer repeat themselves?"
      }
    ]
  },
  {
    key: "truth",
    n: 4,
    title: "Numbers you can trust",
    short: "Trusted data",
    questions: [
      {
        id: "q10",
        text: "When two systems or two reports show different numbers, does everyone know which one to trust?",
        example: "Who really owns an account. Whether a lead was actually contacted. What stage a deal is really in."
      },
      { id: "q11", text: "Do your people trust the CRM enough to act on it — or does everyone keep their own spreadsheet?" },
      { id: "q12", text: "Is the same customer stitched together across your tools, or scattered as duplicates nobody reconciles?" }
    ]
  },
  {
    key: "exceptions",
    n: 5,
    title: "When things go sideways",
    short: "Exceptions",
    questions: [
      {
        id: "q13",
        text: "When something doesn't fit the normal path — a strange lead, a special request — is there a plan, or does it depend on someone remembering what to do?"
      },
      {
        id: "q14",
        text: "Is anything stopping two people (or two tools) from double-working the same lead or sending a customer mixed messages?"
      },
      {
        id: "q15",
        text: "When something falls through, does the right person find out and get what they need to fix it — or does it quietly disappear?"
      }
    ]
  },
  {
    key: "harness",
    n: 6,
    title: "The AI you've put in",
    short: "Your AI",
    questions: [
      { id: "q16", text: "Does your AI or automation have clear limits on what it's allowed to do on its own?" },
      { id: "q17", text: "When automation takes an action, can you count on it doing the right thing the same way every time?" },
      { id: "q18", text: "If the AI gets something wrong, does a person catch it before the customer does — and does someone actually own it?" }
    ]
  },
  {
    key: "measurement",
    n: 7,
    title: "Metrics that change what you do",
    short: "Measurement",
    questions: [
      {
        id: "q19",
        text: "Do you track where things get stuck — not just the totals?",
        example: "Leads that get re-assigned, customers who call back, deals that slip, work that gets redone."
      },
      { id: "q20", text: "When a number moves, does anyone actually do something about it — or does it just get reported?" },
      { id: "q21", text: "Does what you learn from real deals and customers turn into a list of things you actually go fix?" }
    ]
  },
  {
    key: "revops",
    n: 8,
    title: "Seeing the whole customer",
    short: "Full picture",
    questions: [
      {
        id: "q22",
        text: "Do you see the full picture of an account — marketing, sales, service, support, product usage — in one place, or is it scattered across teams?"
      },
      {
        id: "q23",
        text: "When a customer signals they're unhappy (or ready to buy more) in a support ticket, does the revenue team actually act on it?"
      },
      { id: "q24", text: "Do your sales stages and reports reflect how customers actually buy today — or a process from a few years ago?" }
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
  { key: "fragile", min: 0, max: 24, label: "Fragile", blurb: "Most of this runs on heroics and memory. When the right person is out, things break." },
  { key: "reactive", min: 25, max: 49, label: "Reactive", blurb: "The basics work, but they lean on people and workarounds more than on any real system." },
  { key: "steady", min: 50, max: 69, label: "Steady", blurb: "The business runs reliably. The gap now is turning everyday friction into improvement." },
  { key: "measured", min: 70, max: 84, label: "Measured", blurb: "You have real visibility and guardrails. The next gain is teams learning from each other faster." },
  { key: "compounding", min: 85, max: 100, label: "Compounding", blurb: "The operation measures itself and keeps getting better on its own. Rare air." }
];

export function bandFor(score: number): MaturityBand {
  return MATURITY.find((b) => score >= b.min && score <= b.max) ?? MATURITY[0];
}

// Where you'd start with Aventary, keyed off the overall score.
export const ENGAGEMENT: { min: number; max: number; label: string }[] = [
  { min: 0, max: 24, label: "Map how your revenue engine really works" },
  { min: 25, max: 49, label: "Redesign the workflow that's costing you most" },
  { min: 50, max: 69, label: "Add the tracking and guardrails" },
  { min: 70, max: 84, label: "Scale AI on a system that can hold it" },
  { min: 85, max: 100, label: "Ongoing improvement partnership" }
];

export function engagementFor(score: number): string {
  return (ENGAGEMENT.find((e) => score >= e.min && score <= e.max) ?? ENGAGEMENT[0]).label;
}

// Per-area diagnosis + recommended next step when that area is the weakest.
export const RECOMMENDATIONS: Record<
  string,
  { diagnosis: string; nextStep: string; link?: { href: string; label: string } }
> = {
  outcome: {
    diagnosis: "You're tracking activity, but not whether the result actually happened. Busy can look like progress.",
    nextStep: "Define what a real win looks like, and rebuild your reporting around outcomes instead of activity."
  },
  visibility: {
    diagnosis: "The process on paper isn't the process your team actually runs.",
    nextStep: "Map how the work really happens — workarounds and all — before you change anything."
  },
  ownership: {
    diagnosis:
      "Revenue is leaking between teams because it's unclear who owns what and what a clean handoff looks like.",
    nextStep:
      "Fix your most valuable handoff first, and start tracking rework, re-assignments, and how long things wait."
  },
  truth: {
    diagnosis: "Your systems are full of data, but your team doesn't fully trust it — so they work around it.",
    nextStep:
      "Pick the source of truth for the numbers that matter, clean up the duplicates, and get people acting on the CRM again."
  },
  exceptions: {
    diagnosis:
      "The normal path works, but anything unusual turns into a scramble and manual workarounds.",
    nextStep:
      "Design clear paths for your most common exceptions, with guardrails and a clear owner when things break."
  },
  harness: {
    diagnosis:
      "Your AI or automation is running without enough guardrails, oversight, or a clear owner.",
    nextStep:
      "Put the right controls around your highest-risk automation so it saves you time instead of creating cleanup.",
    link: { href: "/insights/the-harness-audit", label: "How to get your money's worth from AI" }
  },
  measurement: {
    diagnosis: "Your metrics report what happened, but they don't tell anyone what to change.",
    nextStep:
      "Start tracking where things get stuck, and tie every number to a decision: fix it, drop it, or double down."
  },
  revops: {
    diagnosis: "The signals about your customers are scattered across teams, so nobody sees the whole account.",
    nextStep: "Bring the customer signals into one view and build one loop from “we noticed” to “someone acted.”"
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
