import { NextResponse, type NextRequest } from "next/server";
import { cookieName, redeemToken, SESSION_DAYS } from "@/lib/client-pages";

// Where magic links land. Redeems the token once, opens a session, and always
// redirects — so the token never stays in the address bar after it is spent.
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const target = new URL(`/c/${slug}`, req.url);

  const session = token ? await redeemToken(slug, token) : null;
  if (!session) {
    target.searchParams.set("e", "expired");
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
