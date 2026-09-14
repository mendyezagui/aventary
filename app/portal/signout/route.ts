import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PORTAL_COOKIE, closePortalSession } from "@/lib/portal";

// Signing out deletes this one session row and clears the cookie. Other devices
// keep theirs — signing out of a laptop should not sign you out of a phone. To
// end every session for an address, delete its portal_sessions rows.

async function signOut(req: NextRequest) {
  await closePortalSession((await cookies()).get(PORTAL_COOKIE)?.value);
  const res = NextResponse.redirect(new URL("/c", req.url), { status: 303 });
  res.cookies.set({ name: PORTAL_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}

export const POST = signOut;
export const GET = signOut;
