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
  const session = password ? await signInWithPassword(slug, password) : null;

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
