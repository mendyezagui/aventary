-- Automation Loops — per-loop publish policy
--
-- Decision (per-loop, not a global switch):
--   • signal_brief      → AUTO-PUBLISHED to the site (the /intelligence brief).
--                          It already runs on the Cloudflare worker; this loop
--                          row exists so the brief is tracked in the framework.
--   • content_from_brief → AUTO-PUBLISHED to /insights (a posts row), no human
--                          step. Reversible from the admin Loops tab (unpublish).
--   • outreach / pipeline hygiene (future) → stay GATED for approval.
--
-- This migration teaches loop_runs about publishing and seeds the brief loop.

-- ------------------------------------------------------------ loop_runs: publish columns
alter table public.loop_runs add column if not exists post_slug    text;
alter table public.loop_runs add column if not exists published_at  timestamptz;
-- Generic output for loops that don't produce content/posts (e.g. the brief:
-- signal count, link, top titles). Keeps the table honest for non-content kinds.
alter table public.loop_runs add column if not exists output        jsonb;

-- Allow the 'published' status. The original constraint was created inline, so
-- it carries the default name loop_runs_status_check.
alter table public.loop_runs drop constraint if exists loop_runs_status_check;
alter table public.loop_runs
  add constraint loop_runs_status_check
  check (status in ('drafted','approved','sent','rejected','failed','published'));

-- ------------------------------------------------------------ loop #1: signal brief
-- Generalizes the Morning Brief into the framework. The brief is produced and
-- auto-published by the Cloudflare worker; the dispatcher records a tracking run
-- here so every loop is visible in one place.
insert into public.loops (slug, name, description, kind, enabled, config)
values (
  'signal-brief',
  'Daily signal brief',
  'The morning Intelligence Brief — top AI/GTM signals, auto-published to /intelligence. Tracked here for observability.',
  'signal_brief',
  true,
  jsonb_build_object(
    'signal_url',  'https://aventary.com/api/morning-brief',
    'public_url',  'https://aventary.com/intelligence',
    'max_signals', 5
  )
)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      kind        = excluded.kind,
      config      = excluded.config,
      updated_at  = now();

-- ------------------------------------------------------------ loop #2: content → auto-publish
-- Repoint the existing content loop from "draft + email for approval" to
-- "draft an Insights article + auto-publish to /insights". The LinkedIn post and
-- newsletter blurb are still drafted and kept on the run for the (gated) outreach
-- loop later — they are NOT sent here.
update public.loops
  set config = config
        || jsonb_build_object(
             'publish_mode', 'auto_post',  -- auto-publish the article to /insights
             'post_author',  'Aventary',
             'slug_prefix',  'signal'      -- post slug: signal-YYYY-MM-DD
           ),
      description = 'Turns the morning Intelligence Brief into an Insights article (auto-published to /insights) plus a LinkedIn post + newsletter blurb kept for outreach.',
      updated_at = now()
  where slug = 'daily-content';
