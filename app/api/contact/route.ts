import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const Schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  company: z.string().max(200).optional(),
  phone: z.string().max(60).optional(),
  message: z.string().min(1).max(5000),
  source: z.string().max(64).optional()
});

async function hashIp(ip: string | null) {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT ?? ""));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  const ip_hash = await hashIp(ip);

  // 1. Persist to Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const sb = createSupabaseAdmin();
      await sb.from("contact_submissions").insert({
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        phone: input.phone ?? null,
        message: input.message,
        source: input.source ?? "contact",
        user_agent: ua,
        ip_hash
      });
    } catch (e) {
      console.error("supabase insert failed", e);
    }
  }

  // 2. Email via Resend (optional; skipped if no key)
  if (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL,
        to: process.env.CONTACT_TO_EMAIL,
        replyTo: input.email,
        subject: `New inquiry — ${input.name}${input.company ? " (" + input.company + ")" : ""}`,
        text:
`Name:    ${input.name}
Email:   ${input.email}
Company: ${input.company ?? "—"}
Phone:   ${input.phone ?? "—"}
Source:  ${input.source ?? "contact"}

Message:
${input.message}`
      });
    } catch (e) {
      console.error("resend failed", e);
    }
  }

  // 3. Auto-responder for the Revenue Leak Detection Kit (diagnostics leads only).
  // Reuses the same Resend transport as the notification above. Wrapped so a
  // failure here never affects the lead capture or the notification.
  if (
    input.source === "diagnostics" &&
    process.env.RESEND_API_KEY &&
    process.env.CONTACT_FROM_EMAIL
  ) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const firstName = input.name.trim().split(/\s+/)[0] || input.name;
      await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL,
        to: input.email,
        replyTo: process.env.CONTACT_TO_EMAIL ?? undefined,
        subject: "Your Pipeline X-Ray \u2014 how to run it (2 min)",
        text:
`Hey ${firstName},

Thanks for grabbing the Revenue Leak Detection Kit! Here's how to get your number, fast.

EXPORT YOUR OPEN PIPELINE (one file, two diagnostics):
\u2022 Salesforce: Reports \u2192 new Opportunity report \u2192 filter to open stages \u2192 add the columns below \u2192 Export \u2192 Details Only \u2192 CSV.
\u2022 HubSpot / Pipedrive: export your open Deals view with the same fields.

Columns: Opportunity name, Account, Owner, Stage, Amount, Close date, Created date, Last activity date.

TWO WAYS TO RUN IT:
1) Fastest \u2014 just reply to this email with that CSV. You'll get your Pipeline Integrity Score and full leak breakdown back, usually same day. Nothing is stored.
2) DIY \u2014 if you run Claude or Codex, reply and I'll send you the skill files to drop in.

One thing: the X-Ray scores pipeline hygiene, not win-likelihood. And if your export is missing fields, it tells you exactly what you can't measure \u2014 that gap is usually the first finding.

Want me to walk your team through what the number means once you've run it? Grab 20 minutes: https://aventary.com/appointments

Ciao,
Mendy
Aventary`,
        html: `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a">
<p>Hey ${firstName},</p>
<p>Thanks for grabbing the <strong>Revenue Leak Detection Kit</strong>! Here's how to get your number, fast.</p>
<p><strong>Export your open pipeline</strong> (one file, two diagnostics):</p>
<ul>
  <li><b>Salesforce:</b> Reports \u2192 new Opportunity report \u2192 filter to open stages \u2192 add the columns below \u2192 Export \u2192 Details Only \u2192 CSV.</li>
  <li><b>HubSpot / Pipedrive:</b> export your open Deals view with the same fields.</li>
</ul>
<p style="background:#f4f4f2;padding:10px 12px;border-radius:6px"><b>Columns:</b> Opportunity name, Account, Owner, Stage, Amount, Close date, Created date, Last activity date.</p>
<p><strong>Two ways to run it:</strong></p>
<ol>
  <li><b>Fastest</b> \u2014 just reply to this email with that CSV. You'll get your Pipeline Integrity Score and full leak breakdown back, usually same day. Nothing is stored.</li>
  <li><b>DIY</b> \u2014 if you run Claude or Codex, reply and I'll send you the skill files to drop in.</li>
</ol>
<p>One thing: the X-Ray scores pipeline <i>hygiene</i>, not win-likelihood. And if your export is missing fields, it tells you exactly what you can't measure \u2014 that gap is usually the first finding.</p>
<p>Want me to walk your team through what the number means once you've run it? <a href="https://aventary.com/appointments">Grab 20 minutes here.</a></p>
<p style="margin-top:18px">Ciao,<br>Mendy<br><span style="color:#777">Aventary</span></p>
</div>`
      });
    } catch (e) {
      console.error("autoresponder failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
