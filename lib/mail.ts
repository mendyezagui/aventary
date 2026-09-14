import { Resend } from "resend";
import { createSupabaseAdmin } from "@/lib/supabase/server";

// Every email this site sends goes through here.
//
// It exists because of one property of the Resend SDK that cost four months of
// silence: `resend.emails.send()` RESOLVES with `{ data: null, error }` on an
// API error — a bad key, an unverified domain, a rejected from-address — rather
// than throwing. Every send in this app was wrapped in a try/catch that
// therefore caught none of the failures most likely to happen, and each one
// separately decided whether to log anything.
//
// The result: RESEND_API_KEY was never set on the Worker, no email had ever
// been delivered, twelve contact submissions went unnotified, and no line was
// written anywhere saying so.
//
// A shared function is the fix that holds. Anything that sends mail gets the
// error check and the audit row by construction rather than by remembering.
// Do not call resend.emails.send() directly anywhere else.

export type MailContext =
  /** Sign-in link for the customer login at /c. */
  | "portal"
  /** Sign-in link for one client document. */
  | "client-page"
  /** "You have a new inquiry" to Mendy, from the contact form. */
  | "contact-notify"
  /** Revenue Leak Detection Kit auto-responder to the person who asked. */
  | "kit-autoresponder"
  /** "Your report is on its way" to a diagnostic lead. */
  | "lead-ack"
  /** "New diagnostic lead" to Mendy, so the report actually gets sent. */
  | "lead-notify";

export type MailHealth = { ok: boolean; missing: string[] };

/**
 * Whether this deploy can send at all.
 *
 * Kept separate from sending because a missing secret is a fact about the
 * DEPLOY — identical for every address on earth — so a sign-in form may safely
 * say so out loud. A delivery failure is about one address and must stay silent
 * to the visitor, or the form becomes a way to ask whether somebody is a
 * customer of ours.
 */
export function mailHealth(): MailHealth {
  const missing = ["RESEND_API_KEY", "CONTACT_FROM_EMAIL"].filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

type SendPayload = {
  to: string | undefined | null;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

/**
 * Sends one email and records what happened.
 *
 * Never throws: a mail failure must not take down the request that triggered
 * it. The caller gets the outcome and decides what, if anything, to show — for
 * a sign-in that is deliberately nothing, and /see is where it surfaces instead.
 */
export async function sendMail(
  context: MailContext,
  payload: SendPayload
): Promise<{ ok: boolean; error: string | null }> {
  const to = payload.to?.trim();
  if (!to) return fail(context, "(no recipient)", "no recipient address configured");

  const health = mailHealth();
  if (!health.ok) return fail(context, to, `not configured: missing ${health.missing.join(", ")}`);

  let failure: string | null = null;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    // The destructure below is the whole point of this file. `error` is a
    // returned value, not a thrown one.
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL!,
      to,
      subject: payload.subject,
      text: payload.text,
      ...(payload.html ? { html: payload.html } : {}),
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {})
    });
    if (error) failure = `${error.name ?? "error"}: ${error.message ?? String(error)}`;
  } catch (err) {
    // Transport faults — DNS, a dropped connection — still throw.
    failure = err instanceof Error ? err.message : String(err);
  }

  if (failure) return fail(context, to, failure);
  await record(context, to, null);
  return { ok: true, error: null };
}

async function fail(context: MailContext, to: string, error: string) {
  console.error(`mail ${context} failed: ${error}`);
  await record(context, to, error);
  return { ok: false, error };
}

/** Best effort. A logging failure must never break the request that sent mail. */
async function record(context: MailContext, email: string, error: string | null) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await createSupabaseAdmin().from("portal_mail_events").insert({
      context,
      email,
      ok: !error,
      error: error ? error.slice(0, 500) : null
    });
  } catch (err) {
    console.error("mail log failed", err);
  }
}

export type MailTrouble = {
  failures: number;
  lastError: { email: string; error: string; at: string; context: string } | null;
  lastSuccessAt: string | null;
};

const TROUBLE_WINDOW_DAYS = 7;

/**
 * Recent send failures, for the staff index.
 *
 * The last SUCCESS comes back alongside them on purpose: "the last email went
 * out fine twenty minutes ago" is what separates a broken mailer from one
 * person who mistyped an address, and without it a single bounce reads as an
 * outage.
 */
export async function recentMailTrouble(): Promise<MailTrouble> {
  const none: MailTrouble = { failures: 0, lastError: null, lastSuccessAt: null };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return none;

  try {
    const db = createSupabaseAdmin();
    const since = new Date(Date.now() - TROUBLE_WINDOW_DAYS * 86400 * 1000).toISOString();

    const [{ data: bad, count }, { data: good }] = await Promise.all([
      db
        .from("portal_mail_events")
        .select("email,error,created_at,context", { count: "exact" })
        .eq("ok", false)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1),
      db
        .from("portal_mail_events")
        .select("created_at")
        .eq("ok", true)
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

    const top = bad?.[0];
    return {
      failures: count ?? 0,
      lastError: top
        ? {
            email: top.email as string,
            error: (top.error as string | null) ?? "no detail recorded",
            at: top.created_at as string,
            context: (top.context as string) ?? "portal"
          }
        : null,
      lastSuccessAt: (good?.[0]?.created_at as string | undefined) ?? null
    };
  } catch (err) {
    console.error("recentMailTrouble failed", err);
    return none;
  }
}
