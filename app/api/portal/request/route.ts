import { NextResponse, type NextRequest } from "next/server";
import { normalizeEmail } from "@/lib/client-pages";
import { mailHealth, sendMail } from "@/lib/mail";
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

  // sendMail reads the error Resend RETURNS rather than throws, and records the
  // outcome. The visitor gets the same redirect either way: telling them the
  // send failed would confirm the address is one we know. /see is where it shows.
  await sendMail("portal", {
    to: email,
    subject: "Your Aventary sign-in link",
    text:
      `Here is your link. It works once and expires in 20 minutes:\n${link.toString()}\n\n` +
      `It opens everything shared with this address, and stays signed in for 30 days.\n\n` +
      `If you did not ask for this you can ignore it — nobody can use the link but you.\n\n— Aventary`
  });

  return done;
}

// A typed URL, a back button, or a mail client prefetching links lands here on
// GET. Send it to the sign-in page rather than an error. Only POST issues a link.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/c", req.url), { status: 303 });
}
