-- Aventary schema — pages, content blocks, posts, contact submissions, admin allowlist
-- Run via: supabase db push (after `supabase link --project-ref ...`)
-- or paste into Supabase SQL editor.

create extension if not exists "uuid-ossp";

-- ---------- pages ----------
create table if not exists public.pages (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,             -- e.g. 'home', 'about', 'contact'
  title        text not null,
  description  text,
  published    boolean not null default true,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ---------- content blocks (ordered sections within a page) ----------
-- type in: 'hero' | 'services' | 'rich_text' | 'cta' | 'form_anchor' | 'image'
create table if not exists public.blocks (
  id          uuid primary key default uuid_generate_v4(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  position    int  not null default 0,
  type        text not null,
  data        jsonb not null default '{}'::jsonb, -- free-form per type
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists blocks_page_position_idx on public.blocks(page_id, position);

-- ---------- blog posts (insights) ----------
create table if not exists public.posts (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  body_md      text not null default '',
  cover_url    text,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists posts_published_idx on public.posts(published_at desc nulls last);

-- ---------- contact submissions ----------
create table if not exists public.contact_submissions (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text not null,
  company     text,
  phone       text,
  message     text not null,
  source      text,                 -- e.g. 'contact', 'appointments'
  user_agent  text,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
create index if not exists contact_created_idx on public.contact_submissions(created_at desc);

-- ---------- admin allowlist ----------
create table if not exists public.admin_users (
  email       text primary key,
  created_at  timestamptz not null default now()
);

-- Seed admin (idempotent; change email after import)
insert into public.admin_users(email) values ('mendy@aventary.com')
  on conflict (email) do nothing;

-- ---------- updated_at triggers ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists pages_touch on public.pages;
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

drop trigger if exists blocks_touch on public.blocks;
create trigger blocks_touch before update on public.blocks
  for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.pages               enable row level security;
alter table public.blocks              enable row level security;
alter table public.posts               enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.admin_users         enable row level security;

-- Public can read published pages/blocks/posts
drop policy if exists "read published pages" on public.pages;
create policy "read published pages" on public.pages
  for select using (published = true);

drop policy if exists "read blocks of published pages" on public.blocks;
create policy "read blocks of published pages" on public.blocks
  for select using (
    exists (select 1 from public.pages p where p.id = blocks.page_id and p.published)
  );

drop policy if exists "read published posts" on public.posts;
create policy "read published posts" on public.posts
  for select using (published_at is not null and published_at <= now());

-- Anyone can insert a contact submission (rate-limited by edge + captcha ideally)
drop policy if exists "insert contact" on public.contact_submissions;
create policy "insert contact" on public.contact_submissions
  for insert with check (true);

-- Admins: full access. An admin is an authenticated user whose email is in admin_users.
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists (
    select 1 from public.admin_users a
    where a.email = auth.jwt() ->> 'email'
  );
$$;

drop policy if exists "admin all pages" on public.pages;
create policy "admin all pages" on public.pages
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all blocks" on public.blocks;
create policy "admin all blocks" on public.blocks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all posts" on public.posts;
create policy "admin all posts" on public.posts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read contact" on public.contact_submissions;
create policy "admin read contact" on public.contact_submissions
  for select using (public.is_admin());

drop policy if exists "admin all admin_users" on public.admin_users;
create policy "admin all admin_users" on public.admin_users
  for all using (public.is_admin()) with check (public.is_admin());
