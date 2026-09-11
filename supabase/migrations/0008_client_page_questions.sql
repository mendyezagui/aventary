-- What readers ask a client page.
--
-- The reason to keep these: a proposal's questions are the client telling you
-- what they actually care about, in their own words, before any meeting. On the
-- LCLA proposal that is discovery material — if three people ask about the
-- billing parallel run, that is the conversation to prepare for.
--
-- Answers are not stored. The question and who asked is the signal; the model's
-- reply is reproducible and would only bloat the table.

create table if not exists public.client_page_questions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null references public.client_pages(slug) on delete cascade,
  email       text,                       -- null when signed in with the shared password
  question    text not null,
  created_at  timestamptz not null default now()
);
comment on column public.client_page_questions.email is
  'Who asked, when they signed in with a link. Null for a shared-password session, which cannot identify anyone.';

create index if not exists client_page_questions_slug_idx
  on public.client_page_questions (slug, created_at desc);

alter table public.client_page_questions enable row level security;
