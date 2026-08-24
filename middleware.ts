import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Keeps Supabase session cookies fresh on the authenticated routes only.
//
// The www→apex canonical redirect that used to live here now runs at the
// routing layer via next.config's redirects() — before middleware and without
// a function invocation — so it applies to every path for free. As a result
// this middleware no longer runs on public traffic: the matcher below scopes
// it to the routes that actually carry a session — /admin, /auth, and the
// carpool app, whose API routes read the session cookie server-side.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );
  try {
    await supabase.auth.getUser();
  } catch {
    // A network blip talking to Supabase shouldn't 500 the page — the route's
    // own code re-checks the session and can render a signed-out state.
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*", "/carpool/:path*", "/api/carpool/:path*"]
};
