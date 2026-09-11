-- Password-free access control for client pages served at /c/<slug>.
--
-- Access is by emailed magic link against a per-page allowlist. There is no
-- password to circulate, nothing to rotate in Cloudflare when a page is added,
-- and — the part a password can never give you — a record of who opened what.
--
-- All three tables are RLS-enabled with no policies, so the anon key cannot
-- reach them at all. Only the service-role client (server-side) can read or
-- write, which is the whole security model: the browser never talks to these.

create table if not exists public.client_pages (
  slug            text primary key,
  title           text not null,
  allowed_emails  text[] not null default '{}',
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
comment on column public.client_pages.allowed_emails is
  'Lowercased addresses that may request a link. Empty means nobody gets in.';

create table if not exists public.client_page_tokens (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null references public.client_pages(slug) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
comment on table public.client_page_tokens is
  'Magic links. Only the SHA-256 of the token is stored, so the database never
   holds anything that would let someone sign in. Single use: used_at is set on
   redemption and a second click is refused.';

create table if not exists public.client_page_sessions (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null references public.client_pages(slug) on delete cascade,
  email         text not null,
  session_hash  text not null unique,
  expires_at    timestamptz not null,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists client_page_tokens_rate_idx
  on public.client_page_tokens (slug, email, created_at desc);
create index if not exists client_page_sessions_lookup_idx
  on public.client_page_sessions (session_hash);

alter table public.client_pages          enable row level security;
alter table public.client_page_tokens    enable row level security;
alter table public.client_page_sessions  enable row level security;

-- Who opened what, and when. The reason to prefer this over a shared password.
create or replace view public.client_page_access as
  select s.slug, s.email, s.created_at as signed_in_at, s.last_seen_at, s.expires_at
  from public.client_page_sessions s
  order by s.created_at desc;
