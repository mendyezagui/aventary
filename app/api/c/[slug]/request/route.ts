import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getContent, issueMagicLink, normalizeEmail } from "@/lib/client-pages";
import { logMailResult } from "@/lib/portal";

// Sends a sign-in link. Deliberately returns the same redirect whether or not
// the address was on the allowlist: the response must not reveal who a client's
// readers are.
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const form = await req.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));

  const target = new URL(`/c/${slug}`, req.url);
  target.searchParams.set("sent", "1");
  const done = NextResponse.redirect(target, { status: 303 });

  const content = await getContent(slug);
  if (!content || !email.includes("@")) return done;

  let token: string | null = null;
  try {
    token = await issueMagicLink(slug, email);
  } catch (err) {
    console.error("client-page link issue failed", err);
  }
  if (!token) return done;

  const link = new URL(`/c/${slug}/verify`, req.url);
  link.searchParams.set("t", token);

  // Same blindness as the portal link, same fix: Resend resolves with
  // { data: null, error } on an API error instead of throwing, so the catch
  // below never saw a bad key. The outcome is recorded either way and shown to
  // staff on /see — never to the visitor, which would confirm the address is on
  // this page's list.
  let failure: string | null = null;
  try {
    if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL,
        to: email,
        subject: `Your link to ${content.title}`,
        text:
          `${content.blurb}\n\n` +
          `Open it here — the link works once and expires in 20 minutes:\n${link.toString()}\n\n` +
          `If you did not ask for this, you can ignore it. Nobody can use the link but you.\n\n— Aventary`
      });
      if (error) failure = `${error.name ?? "error"}: ${error.message ?? String(error)}`;
    } else {
      failure = "Resend is not configured (RESEND_API_KEY / CONTACT_FROM_EMAIL)";
    }
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
  }

  if (failure) console.error("client-page link send failed", failure);
  await logMailResult("client-page", email, failure);

  return done;
}

// Someone landing here directly — a typed URL, a back button, a mail client
// prefetch — gets sent to the page rather than an error page. Only POST signs in.
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return NextResponse.redirect(new URL(`/c/${slug}`, req.url), { status: 303 });
}
