-- What happened to each sign-in email we tried to send.
--
-- The gap this closes: a sign-in form is required to answer identically whether
-- or not it really sent anything — "we could not mail you" confirms the address
-- is one we know. So a delivery failure is invisible to the visitor BY DESIGN,
-- and it was invisible to the owner too, which is the part that was wrong.
--
-- It stayed invisible for four months. RESEND_API_KEY was never set on the
-- Cloudflare Worker and no sign-in link had ever been delivered, while the form
-- cheerfully said one was on its way every time.
--
-- Worse, the code could not have caught it even in a log. Resend's SDK RESOLVES
-- with { data: null, error } on an API error rather than throwing, so the
-- try/catch around every send in this app never fired for the failures most
-- likely to happen: a bad key, an unverified domain, a rejected from-address.
-- The routes now read that error, and record the outcome here.
--
-- Success rows are kept as well as failures, because "the last link went out
-- fine twenty minutes ago" is the fact that distinguishes a broken mailer from
-- a customer who mistyped their address.
--
-- RLS-enabled with no policies, like every other table here: the service role
-- reaches it and nothing else does. There is deliberately NO view over it —
-- see 0010 for why a view is the one thing that reads straight past RLS.

create table if not exists public.portal_mail_events (
  id          uuid primary key default gen_random_uuid(),
  context     text not null,
  email       text not null,
  ok          boolean not null,
  error       text,
  created_at  timestamptz not null default now()
);

comment on table public.portal_mail_events is
  'Outcome of each sign-in email. Read by /see so the owner can see a failure
   the visitor is deliberately never told about.';
comment on column public.portal_mail_events.context is
  'Which send: portal and client-page are sign-in links; contact-notify,
   kit-autoresponder, lead-ack and lead-notify are the contact form and the
   diagnostic leads. Every one of them fails invisibly without this row — the
   sign-in paths because they must not confirm an address, the rest because the
   only person who would notice is the one not being told.';
comment on column public.portal_mail_events.error is
  'Provider error, truncated. Null when ok. Never contains a credential: Resend
   reports the key as invalid without echoing it back.';

create index if not exists portal_mail_events_recent_idx
  on public.portal_mail_events (created_at desc);
create index if not exists portal_mail_events_trouble_idx
  on public.portal_mail_events (ok, created_at desc);

alter table public.portal_mail_events enable row level security;

-- Volume is bounded by the five-links-per-address-per-hour rate limit, so this
-- grows slowly. If it ever needs trimming:
--   delete from portal_mail_events where created_at < now() - interval '90 days';
