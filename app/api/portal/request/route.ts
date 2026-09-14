import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { normalizeEmail } from "@/lib/client-pages";
import { issuePortalLink, logMailResult, mailHealth, safeRedirect } from "@/lib/portal";

// Sends a sign-in link for the customer login.
//
// Like the per-page equivalent it returns the same redirect no matter what
// happened — unknown address, blocked address, rate limited, mail failure. The
// response must never become a way to ask "is this person a customer of
// Aventary's?", and nothing below is allowed to make it one.

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const next = safeRedirect(String(form.get("next") ?? ""));
  const from = safeRedirect(String(form.get("from") ?? ""));

  const target = new URL(from, req.url);
  target.searchParams.set("sent", "1");
  const done = NextResponse.redirect(target, { status: 303 });

  // Checked first, and before the address is looked at in any way, so the answer
  // is the same for every address on earth. A deploy that cannot send mail is a
  // fact about the deploy; saying so leaks nothing and is the difference between
  // a customer retrying forever and somebody fixing it. Everything after this
  // point IS address-specific and must stay silent.
  const mail = mailHealth();
  if (!mail.ok) {
    console.error(`portal link not sent: missing ${mail.missing.join(", ")}`);
    const broken = new URL(from, req.url);
    broken.searchParams.set("e", "mail");
    return NextResponse.redirect(broken, { status: 303 });
  }
  // Narrowed by the check above; read once so the send below is plainly typed.
  const apiKey = process.env.RESEND_API_KEY!;
  const fromAddress = process.env.CONTACT_FROM_EMAIL!;

  if (!email.includes("@")) return done;

  let token: string | null = null;
  try {
    token = await issuePortalLink(email, next);
  } catch (err) {
    console.error("portal link issue failed", err);
  }
  if (!token) return done;

  const link = new URL("/portal/verify", req.url);
  link.searchParams.set("t", token);

  // Resend RESOLVES with { data: null, error } on an API error — a bad key, an
  // unverified domain, a rejected from-address — rather than throwing. A
  // try/catch alone therefore misses exactly the failures most likely to
  // happen, which is how this app sent nothing for four months while logging
  // nothing. Read the error; keep the catch for transport faults.
  let failure: string | null = null;
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "Your Aventary sign-in link",
      text:
        `Here is your link. It works once and expires in 20 minutes:\n${link.toString()}\n\n` +
        `It opens everything shared with this address, and stays signed in for 30 days.\n\n` +
        `If you did not ask for this you can ignore it — nobody can use the link but you.\n\n— Aventary`
    });
    if (error) failure = `${error.name ?? "error"}: ${error.message ?? String(error)}`;
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
  }

  // Still the same redirect either way. The visitor is never told, because
  // telling them confirms the address is one we know — the owner is told
  // instead, on /see, which is the whole point of recording this.
  if (failure) console.error("portal link send failed", failure);
  await logMailResult("portal", email, failure);

  return done;
}

// A typed URL, a back button, or a mail client prefetching links lands here on
// GET. Send it to the sign-in page rather than an error. Only POST issues a link.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/c", req.url), { status: 303 });
}
