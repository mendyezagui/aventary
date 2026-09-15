-- Keep the answer alongside the question, and record which page it was about.
--
-- 0008 deliberately stored only the question, reasoning that the model's reply
-- was reproducible and would bloat the table. That reasoning was wrong in one
-- specific way: an answer is only reproducible if the document has not changed
-- and the model has not changed, and both change. What a client was actually
-- told about a proposal is a fact about a conversation with a client, not a
-- cache of something regenerable — and it is the half you need when they quote
-- it back at you in a meeting.
--
-- Reversed on request, with the owner wanting every exchange mailed to him and
-- visible in the admin section. That is not a bigger table than it sounds:
-- these are questions a handful of readers ask about a handful of proposals.

alter table public.client_page_questions
  add column if not exists answer      text,
  add column if not exists answered_at timestamptz,
  add column if not exists notified_at timestamptz;

comment on column public.client_page_questions.answer is
  'What the reader was told, in full. Null means the answer never arrived — the
   stream failed, or the model errored — which is itself worth being able to see.';
comment on column public.client_page_questions.answered_at is
  'When the answer finished streaming. Null alongside a null answer.';
comment on column public.client_page_questions.notified_at is
  'When the owner was emailed about this exchange. Null means the mail never
   went out; portal_mail_events says why.';

-- The admin table reads newest-first across every page, not per slug.
create index if not exists client_page_questions_recent_idx
  on public.client_page_questions (created_at desc);
