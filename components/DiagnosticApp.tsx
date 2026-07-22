"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DOMAINS,
  SCALE,
  TOTAL_QUESTIONS,
  RECOMMENDATIONS,
  scoreDiagnostic,
  type DiagnosticResult,
  type DomainResult
} from "@/lib/diagnostic";

type Phase = "intro" | "assess" | "results";

/* ------------------------------- Radar chart ------------------------------ */

function Radar({ domains, weakestKey }: { domains: DomainResult[]; weakestKey: string }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 54;
  const n = domains.length;

  const pt = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = domains.map((d, i) => pt(i, (d.score / 100) * r));
  const dataPath = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[340px] mx-auto" role="img" aria-label="Domain score radar">
      {/* grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={domains.map((_, i) => pt(i, ring * r).join(",")).join(" ")}
          fill="none"
          stroke="#d8d4cb"
          strokeWidth={1}
        />
      ))}
      {/* spokes + labels */}
      {domains.map((d, i) => {
        const [sx, sy] = pt(i, r);
        const [lx, ly] = pt(i, r + 22);
        const anchor = Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end";
        return (
          <g key={d.key}>
            <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="#e6e3da" strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="font-label"
              fontSize={9.5}
              fontWeight={700}
              letterSpacing="0.04em"
              fill={d.key === weakestKey ? "#7d6121" : "#6B6B6B"}
            >
              {d.short}
            </text>
          </g>
        );
      })}
      {/* data polygon */}
      <polygon points={dataPath} fill="#C9A66B" fillOpacity={0.28} stroke="#C9A66B" strokeWidth={2} />
      {dataPoints.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={domains[i].key === weakestKey ? 4.5 : 3}
          fill={domains[i].key === weakestKey ? "#7d6121" : "#C9A66B"}
        />
      ))}
    </svg>
  );
}

/* ------------------------------ Email capture ----------------------------- */

function EmailCapture({ result }: { result: DiagnosticResult }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [consent, setConsent] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = first.trim() && emailOk && consent && state !== "sending";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState("sending");
    try {
      const res = await fetch("/api/diagnostic-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostic: "operating_system",
          source: "os_diagnostic",
          name: first.trim(),
          email: email.trim(),
          company: company.trim() || null,
          score: result.overall,
          band: result.band.label,
          notes: `OS Diagnostic · Maturity: ${result.band.label} · Weakest: ${result.weakest.title} (${result.weakest.score}) · Second: ${result.secondWeakest.title} (${result.secondWeakest.score})${role.trim() ? ` · Role: ${role.trim()}` : ""}`
        })
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="bg-surface-container-high rounded-3xl p-8 md:p-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container mb-5">
          <span className="material-symbols-outlined text-on-primary-container">mark_email_read</span>
        </div>
        <h3 className="font-headline text-2xl font-bold mb-3">On its way.</h3>
        <p className="text-on-surface-variant leading-relaxed max-w-lg">
          Your full report and domain breakdown are being put together by hand — give it a few hours
          (sooner in business hours). You&apos;re also first in line for new diagnostics as they
          launch.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-high rounded-3xl p-8 md:p-10">
      <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-2">
        Get the full report
      </div>
      <h3 className="font-headline text-2xl md:text-3xl font-bold mb-2">Your score is ready.</h3>
      <p className="text-on-surface-variant leading-relaxed mb-6 max-w-lg">
        Enter your work email to receive the full report, the domain-by-domain breakdown, and your
        recommended next action.
      </p>
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <input
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="First name"
          autoComplete="given-name"
          className="bg-surface-container-lowest border border-outline-variant rounded-[4px] px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Work email"
          type="email"
          autoComplete="email"
          className="bg-surface-container-lowest border border-outline-variant rounded-[4px] px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          autoComplete="organization"
          className="bg-surface-container-lowest border border-outline-variant rounded-[4px] px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (optional)"
          autoComplete="organization-title"
          className="bg-surface-container-lowest border border-outline-variant rounded-[4px] px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
        />
        <label className="sm:col-span-2 flex items-start gap-3 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 accent-[#C9A66B] w-4 h-4 flex-shrink-0"
          />
          <span>
            I agree Aventary can use my responses to generate this report and follow up. Your
            answers are used only for that — nothing is stored without this consent.
          </span>
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 bg-ink text-inverse-on-surface px-6 py-3 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {state === "sending" ? "Sending…" : "Send me the report"}
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
          {state === "error" ? (
            <span className="text-error text-sm">
              Something went wrong. Try again, or just book a review below.
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/* -------------------------------- Results --------------------------------- */

function Bar({ d, weakestKey }: { d: DomainResult; weakestKey: string }) {
  const weak = d.key === weakestKey;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
      <div className="font-label text-sm font-semibold text-on-surface flex items-center gap-2">
        {d.title}
        {weak ? (
          <span className="font-label text-[10px] font-bold tracking-widest uppercase text-accent bg-primary-fixed px-2 py-0.5 rounded-full">
            Weakest
          </span>
        ) : null}
      </div>
      <div className="font-headline font-bold tabular-nums text-on-surface">{d.score}</div>
      <div className="col-span-2 h-2 rounded-full bg-surface-container-highest overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${d.score}%`, background: weak ? "#7d6121" : "#C9A66B" }}
        />
      </div>
    </div>
  );
}

function Results({ result, onRestart }: { result: DiagnosticResult; onRestart: () => void }) {
  const rec = RECOMMENDATIONS[result.weakest.key];
  return (
    <div className="diag-report max-w-6xl mx-auto">
      {/* Print-only header banner */}
      <div className="hidden print:flex items-center gap-2.5 mb-8 pb-5 border-b border-outline-variant">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0B0B0B" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3.5 L19.5 20.5 L4.5 20.5 Z" />
          <path d="M12 3.5 L12 13.5" />
        </svg>
        <span className="font-label text-sm font-semibold tracking-[0.3em] uppercase">Aventary</span>
        <span className="text-on-surface-variant text-sm">· Operating Systems Diagnostic</span>
      </div>

      {/* Headline */}
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center mb-14">
        <div>
          <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-4">
            Your Operating Score
          </div>
          <div className="flex items-end gap-4 mb-4">
            <div className="font-headline text-7xl md:text-8xl font-bold leading-none text-primary">
              {result.overall}
            </div>
            <div className="font-headline text-2xl font-bold text-on-surface-variant mb-2">/ 100</div>
          </div>
          <div className="font-headline text-3xl font-bold mb-2">
            Maturity: <span className="text-primary italic">{result.band.label}</span>
          </div>
          <p className="text-on-surface-variant leading-relaxed max-w-lg mb-6">{result.band.blurb}</p>
          <p className="text-lg text-on-surface leading-relaxed max-w-lg mb-6">
            Your weakest domain is <strong>{result.weakest.title.toLowerCase()}</strong>.{" "}
            {rec.diagnosis}
          </p>
          <button
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-2 border border-outline-variant rounded-full px-5 py-2.5 font-label font-semibold text-xs tracking-[0.16em] uppercase text-on-surface hover:border-primary/60 transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Download report (PDF)
          </button>
        </div>
        <div className="bg-surface-container-lowest rounded-3xl soft-lift p-6">
          <Radar domains={result.domains} weakestKey={result.weakest.key} />
        </div>
      </div>

      {/* Domain bars */}
      <div className="bg-surface-container-lowest rounded-3xl soft-lift p-8 md:p-10 mb-8">
        <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-6">
          Domain Breakdown
        </div>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
          {result.domains.map((d) => (
            <Bar key={d.key} d={d} weakestKey={result.weakest.key} />
          ))}
        </div>
      </div>

      {/* Recommendation + engagement */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-8 mb-8">
        <div className="bg-ink text-inverse-on-surface rounded-3xl p-8 md:p-10">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-4">
            Recommended Next Step · {result.weakest.title}
          </div>
          <p className="font-headline text-xl md:text-2xl font-bold leading-snug mb-5">
            {rec.nextStep}
          </p>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Second weakest: <span className="text-white/80">{result.secondWeakest.title}</span> (
            {result.secondWeakest.score}). Fixing the weakest domain first usually unlocks the second.
          </p>
          {rec.link ? (
            <Link
              href={rec.link.href}
              className="inline-flex items-center gap-2 text-primary font-label font-semibold text-xs tracking-[0.16em] uppercase hover:opacity-80 transition"
            >
              {rec.link.label}
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          ) : null}
        </div>
        <div className="bg-surface-container-lowest rounded-3xl soft-lift p-8 flex flex-col">
          <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-4">
            Where You&apos;d Start
          </div>
          <div className="font-headline text-2xl font-bold mb-3">{result.engagement}</div>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
            The engagement shape that matches an operating score of {result.overall}.
          </p>
          <Link
            href="/appointments"
            className="mt-auto inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
          >
            Book a Diagnostic Review
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Email capture */}
      <div className="print:hidden">
        <EmailCapture result={result} />
      </div>

      <div className="text-center mt-10 print:hidden">
        <button
          onClick={onRestart}
          className="font-label text-xs font-semibold tracking-[0.16em] uppercase text-on-surface-variant hover:text-on-surface transition"
        >
          ↺ Retake the diagnostic
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Shell ---------------------------------- */

export default function DiagnosticApp() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0); // domain index during assess
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const domain = DOMAINS[step];
  const answeredCount = Object.keys(answers).length;
  const domainComplete = domain?.questions.every((q) => answers[q.id] !== undefined);

  const result = useMemo(
    () => (phase === "results" ? scoreDiagnostic(answers) : null),
    [phase, answers]
  );

  function setAnswer(id: string, value: number) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function next() {
    if (step < DOMAINS.length - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPhase("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back() {
    if (step > 0) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPhase("intro");
    }
  }

  function restart() {
    setAnswers({});
    setNotes({});
    setStep(0);
    setPhase("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---- Intro ---- */
  if (phase === "intro") {
    return (
      <section id="assessment" className="px-8 pb-28 scroll-mt-24">
        <div className="max-w-3xl mx-auto bg-surface-container-lowest rounded-3xl soft-lift p-8 md:p-12">
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {[
              { k: "Time", v: "5 minutes" },
              { k: "Questions", v: `${TOTAL_QUESTIONS}` },
              { k: "Domains", v: `${DOMAINS.length}` }
            ].map((s) => (
              <div key={s.k}>
                <div className="font-headline text-3xl font-bold text-primary">{s.v}</div>
                <div className="font-label text-xs tracking-widest uppercase text-on-surface-variant mt-1">
                  {s.k}
                </div>
              </div>
            ))}
          </div>
          <p className="text-on-surface leading-relaxed mb-3">
            You&apos;ll rate {DOMAINS.length} domains of your operating system on a 0–4 maturity
            scale. It takes about five minutes.
          </p>
          <ul className="text-sm text-on-surface-variant space-y-1.5 mb-8">
            {SCALE.map((s) => (
              <li key={s.value} className="flex gap-3">
                <span className="font-label font-bold text-primary w-4 flex-shrink-0 tabular-nums">
                  {s.value}
                </span>
                <span>
                  <strong className="text-on-surface">{s.label}</strong> — {s.hint}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setPhase("assess");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-lg"
          >
            Start Diagnostic
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </section>
    );
  }

  /* ---- Results ---- */
  if (phase === "results" && result) {
    return (
      <section className="px-8 pb-28">
        <Results result={result} onRestart={restart} />
      </section>
    );
  }

  /* ---- Assess ---- */
  const pct = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  return (
    <section className="px-8 pb-28">
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="font-label text-xs font-bold tracking-widest uppercase text-accent">
              Domain {domain.n} of {DOMAINS.length} · {domain.title}
            </div>
            <div className="font-label text-xs font-semibold text-on-surface-variant tabular-nums">
              {answeredCount}/{TOTAL_QUESTIONS}
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {domain.questions.map((q, qi) => (
            <div
              key={q.id}
              className="bg-surface-container-lowest rounded-3xl soft-lift p-6 md:p-8"
            >
              <div className="flex gap-3 mb-1">
                <span className="font-headline text-lg font-bold text-primary flex-shrink-0">
                  Q{DOMAINS.slice(0, step).reduce((a, d) => a + d.questions.length, 0) + qi + 1}.
                </span>
                <h3 className="font-headline text-lg md:text-xl font-bold leading-snug">{q.text}</h3>
              </div>
              {q.example ? (
                <p className="text-on-surface-variant text-sm mb-4 ml-9">{q.example}</p>
              ) : (
                <div className="mb-4" />
              )}
              <div className="grid grid-cols-5 gap-2 ml-0 md:ml-9">
                {SCALE.map((s) => {
                  const sel = answers[q.id] === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setAnswer(q.id, s.value)}
                      title={`${s.label} — ${s.hint}`}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-3 transition-colors ${
                        sel
                          ? "bg-ink text-inverse-on-surface border-ink"
                          : "bg-surface border-outline-variant text-on-surface-variant hover:border-primary/60 hover:text-on-surface"
                      }`}
                    >
                      <span className="font-headline text-xl font-bold">{s.value}</span>
                      <span className="text-[10px] leading-tight text-center font-label">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Optional evidence note */}
          <div className="px-2">
            <label className="font-label text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
              Evidence note for {domain.title.toLowerCase()} (optional)
            </label>
            <textarea
              value={notes[domain.key] ?? ""}
              onChange={(e) => setNotes((nn) => ({ ...nn, [domain.key]: e.target.value }))}
              rows={2}
              placeholder="Anything that shaped your ratings above — a system, a workaround, a recent incident."
              className="mt-2 w-full bg-surface-container-lowest border border-outline-variant rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={back}
            className="font-label text-xs font-semibold tracking-[0.16em] uppercase text-on-surface-variant hover:text-on-surface transition"
          >
            ← Back
          </button>
          <button
            onClick={next}
            disabled={!domainComplete}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-full font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === DOMAINS.length - 1 ? "See my score" : "Next domain"}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </section>
  );
}
