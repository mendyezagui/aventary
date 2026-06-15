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
  // Fail safe: only attempt the session refresh when Supabase is fully
  // configured. If either var is missing at build time, createServerClient
  // would be called with an undefined key and throw on EVERY request — and
  // since this middleware runs on all routes, that 500s the entire site.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res;

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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
  // Never let an auth/network hiccup take down every route.
  try {
    await supabase.auth.getUser();
  } catch {
    // Session couldn't be refreshed this request; serve the page anyway.
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
