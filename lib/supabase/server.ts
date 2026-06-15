import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client that reads the user's session cookie.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* Called from a Server Component — ignore. */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            /* ignore */
          }
        }
      }
    }
  );
}

/**
 * Cookie-less anon client for PUBLIC reads (published pages/posts).
 *
 * Public content does not depend on the visitor's session, so this client
 * deliberately does NOT call cookies(). Reading cookies would opt the page out
 * of static rendering and, on a page declared with `revalidate`, throw
 * "Page changed from static to dynamic at runtime" in production. Use this for
 * anything rendered on a static/ISR route; use createSupabaseServer() only when
 * the request's auth session actually matters (admin, auth callbacks).
 */
export function createSupabasePublic() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Service-role client. Bypasses RLS. Never expose to the browser.
 */
export function createSupabaseAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
