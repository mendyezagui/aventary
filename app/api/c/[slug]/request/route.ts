import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getContent, issueMagicLink, normalizeEmail } from "@/lib/client-pages";

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

  const content = getContent(slug);
  if (!content || !email.includes("@")) return done;

  const token = await issueMagicLink(slug, email);
  if (!token) return done;

  const link = new URL(`/c/${slug}/verify`, req.url);
  link.searchParams.set("t", token);

  try {
    if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL,
        to: email,
        subject: `Your link to ${content.title}`,
        text:
          `${content.blurb}\n\n` +
          `Open it here — the link works once and expires in 20 minutes:\n${link.toString()}\n\n` +
          `If you did not ask for this, you can ignore it. Nobody can use the link but you.\n\n— Aventary`
      });
    } else {
      console.error("client-page link not sent: Resend is not configured");
    }
  } catch (err) {
    // Never surface mail failures to the visitor — it would confirm the address
    // is on the list. It is logged instead.
    console.error("client-page link send failed", err);
  }

  return done;
}
