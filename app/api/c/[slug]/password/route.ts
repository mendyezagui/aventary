import { NextResponse, type NextRequest } from "next/server";
import { cookieName, signInWithPassword, SESSION_DAYS } from "@/lib/client-pages";

// The shared-password route. Same destination as a magic link; the session it
// opens is recorded as anonymous, because a shared password cannot tell you who
// used it.
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const form = await req.formData();
  const password = String(form.get("password") ?? "");

  const target = new URL(`/c/${slug}`, req.url);

  // Nothing below is allowed to reach the browser as a 500. A sign-in form that
  // errors out tells a visitor nothing and looks broken; a refusal at least
  // tells them to try again. Failures are logged instead.
  let session: string | null = null;
  try {
    session = password ? await signInWithPassword(slug, password) : null;
  } catch (err) {
    console.error("client-page password sign-in failed", err);
  }

  if (!session) {
    target.searchParams.set("e", "password");
    return NextResponse.redirect(target, { status: 303 });
  }

  const res = NextResponse.redirect(target, { status: 303 });
  res.cookies.set({
    name: cookieName(slug),
    value: session,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/c/${slug}`,
    maxAge: SESSION_DAYS * 86400
  });
  return res;
}

// Someone landing here directly — a typed URL, a back button, a mail client
// prefetch — gets sent to the page rather than an error page. Only POST signs in.
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return NextResponse.redirect(new URL(`/c/${slug}`, req.url), { status: 303 });
}
