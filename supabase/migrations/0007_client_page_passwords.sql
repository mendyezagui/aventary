-- Adds an optional shared password alongside the emailed sign-in link.
--
-- Both methods open the same session. They differ in what they can tell you
-- afterwards: a link identifies the reader, a shared password cannot. So the
-- session records which was used and email becomes nullable, rather than
-- pretending an anonymous sign-in has an address attached to it.

alter table public.client_pages
  add column if not exists password_hash text;
comment on column public.client_pages.password_hash is
  'PBKDF2-SHA256 as pbkdf2-sha256$<iterations>$<salt b64>$<hash b64>. Null means
   the page is link-only. Never store the password itself.';

alter table public.client_page_sessions
  alter column email drop not null;
alter table public.client_page_sessions
  add column if not exists method text not null default 'link';
comment on column public.client_page_sessions.method is
  '"link" — signed in from an emailed link, email is known. "password" — used the
   shared password, so there is no identity to record.';

-- Renaming a column means replacing the view outright; CREATE OR REPLACE cannot.
drop view if exists public.client_page_access;
create view public.client_page_access as
  select s.slug,
         coalesce(s.email, '(shared password)') as reader,
         s.method,
         s.created_at as signed_in_at,
         s.last_seen_at,
         s.expires_at
  from public.client_page_sessions s
  order by s.created_at desc;
