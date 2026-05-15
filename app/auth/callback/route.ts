import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Magic-link / PKCE callback. The login form sends users here with a `code`
 * query param. We exchange it for a session (sets the auth cookies) and then
 * forward them to whatever `next` was requested (defaults to /admin).
 *
 * Route Handlers can set cookies; Server Components cannot — which is why
 * this lives here and not inside /admin/page.tsx.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}
