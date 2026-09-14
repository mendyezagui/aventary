import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { normalizeEmail } from "@/lib/client-pages";
import { issuePortalLink, safeRedirect } from "@/lib/portal";

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

  try {
    if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL,
        to: email,
        subject: "Your Aventary sign-in link",
        text:
          `Here is your link. It works once and expires in 20 minutes:\n${link.toString()}\n\n` +
          `It opens everything shared with this address, and stays signed in for 30 days.\n\n` +
          `If you did not ask for this you can ignore it — nobody can use the link but you.\n\n— Aventary`
      });
    } else {
      console.error("portal link not sent: Resend is not configured");
    }
  } catch (err) {
    // Never surfaced to the visitor: a mail error shown on screen would confirm
    // the address is one we know. Logged instead.
    console.error("portal link send failed", err);
  }

  return done;
}

// A typed URL, a back button, or a mail client prefetching links lands here on
// GET. Send it to the sign-in page rather than an error. Only POST issues a link.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/c", req.url), { status: 303 });
}
