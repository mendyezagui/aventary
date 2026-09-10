import { NextResponse, type NextRequest } from "next/server";
import { LCLA_COOKIE, expectedToken, sha256Hex, safeEqual } from "@/lib/lcla";

// Verifies the shared password and sets the access cookie. Always redirects
// back to /lcla — on failure with ?e=1, so the wrong-password message is
// rendered by the page rather than returned as an API body.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const submitted = String(form.get("password") ?? "");
  const expected = await expectedToken();
  const url = new URL("/lcla", req.url);

  if (!expected) {
    url.searchParams.set("e", "unconfigured");
    return NextResponse.redirect(url, { status: 303 });
  }

  const candidate = await sha256Hex(submitted);
  if (!safeEqual(candidate, expected)) {
    url.searchParams.set("e", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set({
    name: LCLA_COOKIE,
    value: expected,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}
