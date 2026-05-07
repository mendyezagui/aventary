import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "edge";

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

  return NextResponse.json({ ok: true });
}
