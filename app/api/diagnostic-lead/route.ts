import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Leads from the in-browser diagnostics (Pipeline X-Ray, Forecast Stress Test)
// are written to the Second Brain Supabase `diagnostic_leads` table — a
// different project from the aventary site DB. The pipeline CSV is NEVER sent
// here: only the email, the computed score, and the lead's contact details.

function bandFor(score: number | null): string | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score >= 80) return "Tight";
  if (score >= 60) return "Leaking";
  if (score >= 40) return "Unreliable";
  return "Fiction";
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const name = typeof b.name === "string" ? b.name.trim() : null;
  const company = typeof b.company === "string" ? b.company.trim() : null;
  const score = Number.isFinite(b.score) ? Number(b.score) : null;
  const diagnostic = typeof b.diagnostic === "string" ? b.diagnostic : "pipeline_xray";
  const heardVia = typeof b.heard_via === "string" && b.heard_via.trim() ? b.heard_via.trim() : null;

  // 1. Persist to Second Brain
  if (!process.env.SECOND_BRAIN_SUPABASE_URL || !process.env.SECOND_BRAIN_SERVICE_ROLE_KEY) {
    console.error("Second Brain env vars missing; lead not stored.");
    return NextResponse.json({ error: "capture not configured" }, { status: 500 });
  }
  const supabase = createClient(
    process.env.SECOND_BRAIN_SUPABASE_URL,
    process.env.SECOND_BRAIN_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  // The OS diagnostic supplies its own maturity band (Fragile…Adaptive); the
  // pipeline tools fall back to the integrity band (Tight…Fiction).
  const band =
    typeof b.band === "string" && b.band.trim() ? b.band.trim() : bandFor(score);

  const { error } = await supabase.from("diagnostic_leads").insert({
    email,
    name,
    company,
    diagnostic,
    integrity_score: score,
    reported_band: band,
    wants_pdf: b.wants_pdf !== false,
    wants_future_tools: b.wants_future_tools !== false,
    source: typeof b.source === "string" ? b.source : null,
    status: "new",
    notes:
      typeof b.notes === "string" && b.notes.trim()
        ? b.notes.trim()
        : heardVia
          ? `heard_via: ${heardVia}`
          : null,
  });
  if (error) {
    console.error("diagnostic_leads insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Emails via Resend (reuses the site's existing config; skipped if unset).
  //    Never blocks the response — the lead is already saved.
  if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const first = (name || "").split(/\s+/)[0] || "there";
    const scoreLabel = score != null ? `${score}/100` : "your";
    const isOS = diagnostic === "operating_system";

    // 2a. Instant acknowledgment to the lead (report itself is sent manually).
    const ack = isOS
      ? {
          subject: `Your Operating Systems Diagnostic (${scoreLabel}${band ? `, ${band}` : ""}) is on its way`,
          text:
`Hey ${first},

Got it — your Operating Systems Diagnostic report is on its way. I put the breakdown together by hand, so give it a few hours (sooner in business hours).

You scored ${scoreLabel}${band ? ` (${band})` : ""}. The full report walks the weakest domain, what's driving the leak, and the exact next build to close it — plus where you'd start with Aventary.

A reminder: your answers are used only to generate this report. Nothing was stored without your consent.

Reply here if you want me to walk your team through the score.

Ciao,
Mendy
Aventary`,
          html:
`<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a">
<p>Hey ${first},</p>
<p>Got it — your <strong>Operating Systems Diagnostic</strong> report is on its way. I put the breakdown together by hand, so give it a few hours (sooner in business hours).</p>
<p>You scored <strong>${scoreLabel}${band ? ` (${band})` : ""}</strong>. The full report walks the weakest domain, what's driving the leak, and the exact next build to close it — plus where you'd start with Aventary.</p>
<p style="color:#555">A reminder: your answers are used only to generate this report. Nothing was stored without your consent.</p>
<p>Reply here if you want me to walk your team through the score.</p>
<p style="margin-top:18px">Ciao,<br>Mendy<br><span style="color:#777">Aventary</span></p>
</div>`,
        }
      : {
          subject: `Your Pipeline X-Ray teardown (${scoreLabel}) is on its way`,
          text:
`Hey ${first},

Got it — your ${scoreLabel} Pipeline X-Ray teardown is on its way. I put it together by hand, so give it a few hours (sooner in business hours).

The full report quantifies every leak in dollars, shows where ${scoreLabel} sits against other teams, and you're now first in line for the next three diagnostics as they launch.

A reminder: your pipeline file never left your browser. All we stored is your email and your score.

Reply here if you want me to walk your team through the number once it lands.

Ciao,
Mendy
Aventary`,
          html:
`<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a">
<p>Hey ${first},</p>
<p>Got it — your <strong>${scoreLabel}</strong> Pipeline X-Ray teardown is on its way. I put it together by hand, so give it a few hours (sooner in business hours).</p>
<p>The full report quantifies every leak in dollars, shows where ${scoreLabel} sits against other teams, and you're now first in line for the next three diagnostics as they launch.</p>
<p style="color:#555">A reminder: your pipeline file never left your browser. All we stored is your email and your score.</p>
<p>Reply here if you want me to walk your team through the number once it lands.</p>
<p style="margin-top:18px">Ciao,<br>Mendy<br><span style="color:#777">Aventary</span></p>
</div>`,
        };
    try {
      await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL,
        to: email,
        replyTo: process.env.CONTACT_TO_EMAIL ?? undefined,
        subject: ack.subject,
        text: ack.text,
        html: ack.html,
      });
    } catch (e) {
      console.error("lead ack email failed", e);
    }

    // 2b. Heads-up to Mendy so the PDF actually gets sent (capture is manual-fulfilled).
    if (process.env.CONTACT_TO_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.CONTACT_FROM_EMAIL,
          to: process.env.CONTACT_TO_EMAIL,
          replyTo: email,
          subject: `New diagnostic lead — ${name ?? email}${score != null ? ` (${score}/100)` : ""}`,
          text:
`New ${diagnostic} lead — send the report.

Name:    ${name ?? "—"}
Email:   ${email}
Company: ${company ?? "—"}
Score:   ${score != null ? `${score}/100${band ? ` (${band})` : ""}` : "—"}
Detail:  ${typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : heardVia ? `heard_via: ${heardVia}` : "—"}
Source:  ${typeof b.source === "string" && b.source ? b.source : "—"}`,
        });
      } catch (e) {
        console.error("lead notify email failed", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
