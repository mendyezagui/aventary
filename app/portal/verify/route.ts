import { NextResponse, type NextRequest } from "next/server";
import { PORTAL_COOKIE, PORTAL_SESSION_DAYS, redeemPortalToken } from "@/lib/portal";

// Where portal sign-in links land. Spends the token, opens the session, and
// always redirects, so the token is never left sitting in the address bar — or
// in a browser history, or in the Referer of the next request.

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const result = token ? await redeemPortalToken(token) : null;

  if (!result) {
    const failed = new URL("/c", req.url);
    failed.searchParams.set("e", "expired");
    return NextResponse.redirect(failed, { status: 303 });
  }

  const res = NextResponse.redirect(new URL(result.redirectTo, req.url), { status: 303 });
  res.cookies.set({
    name: PORTAL_COOKIE,
    value: result.session,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Site-wide, unlike cp_<slug>. It has to be readable at /c, at /see and at
    // every /c/<slug>, which is the whole point of one login — and the reason
    // it is httpOnly and the reason portal_people.active exists as a kill
    // switch. The cookie carries no identity of its own: it is an opaque
    // random string, and who it belongs to is looked up server-side per request.
    path: "/",
    maxAge: PORTAL_SESSION_DAYS * 86400
  });
  return res;
}
