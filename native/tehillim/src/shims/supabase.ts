/**
 * Stands in for the site's Supabase browser client.
 *
 * The app ships without Supabase credentials on purpose: version one is the
 * part of Tehillim that needs nothing — the text, the daily portion, saved
 * Psalms, Tehillim for a name. `hasSupabase()` in `app/tehillim/account.ts`
 * reads the same two env vars this build defines as empty, so the sign-in and
 * circle features hide themselves and nothing here is ever constructed.
 *
 * If this does get called, something asked for the network without checking
 * `hasSupabase()` first, and a clear error beats a silent no-op that looks like
 * a sync succeeding.
 */
export function createSupabaseBrowser(): never {
  throw new Error(
    "Tehillim: Supabase is not configured in the app build — guard the call with hasSupabase().",
  );
}
