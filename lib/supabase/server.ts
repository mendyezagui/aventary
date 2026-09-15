import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Is the anon-key Supabase client actually usable?
 *
 * Both halves, not just the URL. They are separate pieces of Worker config and
 * a deploy can remove one without the other — a plain-text var is replaced by
 * whatever wrangler.jsonc declares, while an encrypted secret is left alone. On
 * 2026-09-15 exactly that happened: the URL survived as a secret, the anon key
 * was wiped as a var, and every caller that checked only the URL sailed past
 * its guard into createServerClient(url, undefined) and took down /, /insights,
 * /videos, /contact and /diagnostics.
 *
 * Callers use this so a half-configured deploy degrades to seed content instead
 * of throwing. Both values are declared in wrangler.jsonc now, so a deploy
 * restores them rather than erasing them, but the guard is the belt to that
 * braces: config can go missing in ways version control cannot prevent.
 */
export function supabaseAnonConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

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
