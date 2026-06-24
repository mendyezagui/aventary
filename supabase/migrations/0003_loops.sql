-- Automation Loops framework
-- A "loop" is a scheduled AI job. Each run produces a draft that lands in the
-- admin Loops tab for review; on approval it is sent (Resend). Nothing leaves
-- without a human click.
--
-- Loop #1 ("daily-content"): reuse the Morning Brief signals to draft a
-- LinkedIn post + newsletter blurb every morning.
--
-- RLS: both tables are locked to the service role only (no anon/auth policies).
-- The dispatcher Edge Function and the admin server actions use the service-role
-- key; the admin UI is already gated by requireAdmin(). Browser clients with the
-- anon key get nothing.

-- ------------------------------------------------------------ loops (definitions)
create table if not exists public.loops (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  kind        text not null,                 -- e.g. 'content_from_brief'
  enabled     boolean not null default true,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------ loop_runs (outputs)
create table if not exists public.loop_runs (
  id                uuid primary key default gen_random_uuid(),
  loop_id           uuid not null references public.loops(id) on delete cascade,
  run_date          date not null default current_date,
  status            text not null default 'drafted'
                      check (status in ('drafted','approved','sent','rejected','failed')),
  title             text,
  linkedin_post     text,
  newsletter_subject text,
  newsletter_body   text,
  signals           jsonb,                   -- the source items the draft was built from
  model             text,
  error             text,
  created_at        timestamptz not null default now(),
  decided_at        timestamptz,
  decided_by        text,
  sent_at           timestamptz,
  sent_to           text
);

-- One run per loop per day — makes the dispatcher safe to call repeatedly.
create unique index if not exists loop_runs_loop_day_uniq
  on public.loop_runs (loop_id, run_date);

create index if not exists loop_runs_status_idx on public.loop_runs (status, created_at desc);

alter table public.loops     enable row level security;
alter table public.loop_runs enable row level security;
-- Intentionally no policies: service-role only.

-- ------------------------------------------------------------ seed loop #1
insert into public.loops (slug, name, description, kind, enabled, config)
values (
  'daily-content',
  'Daily content drafts',
  'Turns the morning Intelligence Brief into a LinkedIn post + newsletter blurb, queued for approval.',
  'content_from_brief',
  true,
  jsonb_build_object(
    'signal_url', 'https://aventary.com/api/morning-brief',
    'max_signals', 5,
    'send_mode', 'email_admin',          -- email the approved draft to send_to (safe default)
    'send_to', 'mendy@aventary.com'
  )
)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      config = excluded.config,
      updated_at = now();
