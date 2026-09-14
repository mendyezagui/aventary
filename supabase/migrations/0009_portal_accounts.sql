-- Turns /c from a set of independently-gated documents into one customer login.
--
-- Before this, a session was per page: the cookie was cp_<slug>, scoped to
-- /c/<slug>, and a reader with access to two documents signed in twice with no
-- notion that both were the same person. There was no index, so a customer had
-- to be sent a URL for every document, and there was no way to ask "what may
-- this person see?" without reading every allowlist.
--
-- This adds an identity layer NEXT TO that, never on top of it. Nothing here
-- alters an existing column, drops anything, or changes what a link already in
-- someone's inbox does. The per-page tables keep working exactly as they did,
-- which is the point: sign-in links and shared passwords already out in the
-- world must not break on a deploy.
--
-- Every table here is RLS-enabled with no policies, like the rest of the
-- client_page_* family: the service-role client reaches them and nothing else
-- does. The browser never talks to these.

-- Who may sign in, and what that person is.
--
-- A CLIENT does not need a row. Their access is the allowlist on the pages
-- shared with them, which is where it has always lived and where it is edited
-- on a phone call. A row here is for the two things an allowlist cannot say:
-- "this person is staff and sees everything", and "this person is blocked".
create table if not exists public.portal_people (
  email       text primary key,
  name        text,
  role        text not null default 'client'
                check (role in ('owner', 'staff', 'client')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.portal_people is
  'Identities for the customer login at /c. Clients are implied by page
   allowlists and need no row; rows here exist to grant staff/owner sight of
   everything, or to block someone outright.';
comment on column public.portal_people.email is
  'Lowercased. The primary key deliberately: one person, one address, one row.';
comment on column public.portal_people.role is
  '"owner"/"staff" see every active page and the project index at /see.
   "client" sees only the pages whose allowed_emails carry this address.';
comment on column public.portal_people.active is
  'false blocks the address everywhere, allowlists included. This is the kill
   switch: it beats every grant rather than sitting alongside them, so removing
   somebody is one write instead of an audit of every page.';

-- Sign-in links for the portal. Same shape and same reasoning as
-- client_page_tokens: only the SHA-256 is stored, single use, short-lived.
-- Separate from that table because these are not scoped to a slug — they open
-- an identity, and the "which page" question is answered afterwards by role and
-- allowlist rather than baked into the link.
create table if not exists public.portal_tokens (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token_hash  text not null unique,
  redirect_to text,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
comment on column public.portal_tokens.redirect_to is
  'Where to land after signing in, so a link to one document still opens that
   document. Validated as a site-relative /c or /see path on redemption — never
   trusted as written, or this is an open redirect with a session attached.';

-- The signed-in session. Site-wide by necessity: it has to be readable at /c,
-- at /see and at every /c/<slug>, so unlike cp_<slug> its cookie is not scoped
-- to one document's path. That is the cost of a single login, and it is why the
-- cookie is httpOnly and why `active` above exists.
create table if not exists public.portal_sessions (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  session_hash  text not null unique,
  expires_at    timestamptz not null,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists portal_tokens_rate_idx
  on public.portal_tokens (email, created_at desc);
create index if not exists portal_sessions_lookup_idx
  on public.portal_sessions (session_hash);
create index if not exists portal_sessions_email_idx
  on public.portal_sessions (email);

alter table public.portal_people   enable row level security;
alter table public.portal_tokens   enable row level security;
alter table public.portal_sessions enable row level security;

-- What /see needs beyond what client_pages already holds. All nullable or
-- defaulted, so every existing row stays valid and unedited.
--
-- There is deliberately no new "status" column. client_pages.active already
-- means "open to its readers", and a project index that sorted on a second,
-- nearly-synonymous flag would invite the two to disagree. Active is active.
alter table public.client_pages
  add column if not exists client_name text,
  add column if not exists summary     text,
  add column if not exists sort        integer not null default 0;
comment on column public.client_pages.client_name is
  'Who the page is for, as it should read on the index at /see — "Prime Rock
   Realty", not the slug. Falls back to the slug when null.';
comment on column public.client_pages.summary is
  'One line of context on the /see index. Staff-facing; never shown to a client.';
comment on column public.client_pages.sort is
  'Manual ordering on /see. Higher floats up; ties fall back to newest first.';

-- Who is signed in to the portal right now, and as what. The per-page
-- equivalent of client_page_access, for the identity sessions.
create or replace view public.portal_access as
  select s.email,
         coalesce(p.role, 'client') as role,
         p.name,
         s.created_at   as signed_in_at,
         s.last_seen_at,
         s.expires_at
  from public.portal_sessions s
  left join public.portal_people p on p.email = s.email
  order by s.created_at desc;

-- The owner. Without at least one row here /see is a page nobody on earth can
-- open, so this one seed is part of the schema rather than a follow-up step.
insert into public.portal_people (email, name, role)
values ('mendy@aventary.com', 'Mendy Ezagui', 'owner')
on conflict (email) do nothing;
