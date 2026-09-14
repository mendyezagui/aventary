-- Closes a hole in the two access-log views: both were readable with the
-- public anon key.
--
-- The tables were never the problem. client_page_sessions and portal_sessions
-- are RLS-enabled with no policies, so PostgREST hands the anon key nothing,
-- which is the whole security model and it works.
--
-- A view is the exception nobody remembers. In Postgres 15+ a view runs as its
-- OWNER unless told otherwise, and these are owned by postgres — so the view
-- read the underlying tables with RLS bypassed and then handed the result to
-- whoever asked. anon holds SELECT on everything in public by Supabase default,
-- so `GET /rest/v1/client_page_access` returned real rows to an unauthenticated
-- request. Verified against the endpoint, not the catalogue: nine of them.
--
-- What was actually exposed on the day this was found was thin — every session
-- so far was a shared-password one, which records the reader as
-- "(shared password)" and names nobody. That was luck. The view's own purpose
-- is to record WHO read WHAT, so the first link sign-in would have published a
-- client's address, and portal_access would have published every staff and
-- customer address alongside their role.
--
-- security_invoker makes the view run as the caller instead, which puts it back
-- under the RLS of the tables beneath it: anon gets nothing, and the service
-- role — which bypasses RLS, and is the only thing the site ever reads these
-- with — is unaffected. The explicit revoke is belt and braces; nothing in this
-- repo reads either view with a browser key.
--
-- The lesson worth keeping: RLS on a table does not cover a view over it.
-- Any future view in this schema needs security_invoker set the same way.

alter view public.client_page_access set (security_invoker = on);
alter view public.portal_access       set (security_invoker = on);

revoke all on public.client_page_access from anon, authenticated;
revoke all on public.portal_access       from anon, authenticated;
