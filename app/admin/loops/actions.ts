"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Approve a drafted run and send it. send_mode 'email_admin' emails the approved
 * LinkedIn post + newsletter to the loop's send_to address (so you can post it).
 * Nothing is sent until this action runs.
 */
export async function approveAndSend(formData: FormData) {
  const { email } = await requireAdmin();
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;

  const sb = createSupabaseAdmin();

  const { data: run } = await sb
    .from("loop_runs")
    .select("id, status, linkedin_post, newsletter_subject, newsletter_body, loop_id")
    .eq("id", runId)
    .single();

  if (!run || run.status !== "drafted") return;

  const { data: loop } = await sb
    .from("loops")
    .select("config")
    .eq("id", run.loop_id)
    .single();

  const cfg = (loop?.config ?? {}) as Record<string, unknown>;
  const sendTo = String(cfg.send_to ?? process.env.CONTACT_TO_EMAIL ?? "");

  let sentTo: string | null = null;
  if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL && sendTo) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL,
      to: sendTo,
      subject: `Approved draft — ${run.newsletter_subject ?? "content"}`,
      text:
`Approved by ${email}

=== LINKEDIN POST ===
${run.linkedin_post ?? "(none)"}

=== NEWSLETTER ===
Subject: ${run.newsletter_subject ?? "(none)"}

${run.newsletter_body ?? "(none)"}`,
    });
    sentTo = sendTo;
  }

  await sb
    .from("loop_runs")
    .update({
      status: "sent",
      decided_at: new Date().toISOString(),
      decided_by: email,
      sent_at: new Date().toISOString(),
      sent_to: sentTo,
    })
    .eq("id", runId);

  revalidatePath("/admin/loops");
}

/** Reject a drafted run — it stays for the record but is never sent. */
export async function reject(formData: FormData) {
  const { email } = await requireAdmin();
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;

  const sb = createSupabaseAdmin();
  await sb
    .from("loop_runs")
    .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: email })
    .eq("id", runId);

  revalidatePath("/admin/loops");
}
