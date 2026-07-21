import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Keeps Supabase session cookies fresh on every request.
export async function middleware(req: NextRequest) {
  // Canonicalize the host: 301 www.aventary.com → aventary.com. The site is
  // served on both hosts, but the morning-brief Worker is only routed on the
  // apex, so /intelligence's fetch("/api/morning-brief") 404s on www. Sending
  // everyone to the apex keeps a single canonical host and fixes the brief.
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4);
    return NextResponse.redirect(url, 301);
  }

  const res = NextResponse.next();

  // Refreshing the Supabase session costs a network round-trip to the Auth
  // server. Doing it on every request — the previous behavior — billed Fluid
  // Active CPU on every anonymous page view, prefetch, and crawler hit for no
  // benefit: the public pages read no session (anon client), and the admin
  // pages re-validate via requireAdmin(). So spend the round-trip only on the
  // routes that actually carry a session.
  const path = req.nextUrl.pathname;
  const needsSession = path.startsWith("/admin") || path.startsWith("/auth");
  if (!needsSession || !process.env.NEXT_PUBLIC_SUPABASE_URL) return res;

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
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
