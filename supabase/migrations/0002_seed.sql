-- Seed: aventary.com content using the rich block schema (hero / services bento /
-- stats / why / cta / form_anchor). Run after 0001_init.sql.
-- The TS file lib/seed.ts mirrors this — keep them in sync if you edit either.

-- ------------------------------------------------------------ HOME
insert into public.pages(slug, title, description)
values ('home', 'Aventary | AI-Driven Leadership & Strategy',
  'AI-first product strategy, fractional CPO/CTO leadership, and RevOps systems for non-tech companies.')
on conflict (slug) do update set title = excluded.title, description = excluded.description;

with p as (select id from public.pages where slug = 'home')
insert into public.blocks(page_id, position, type, data) values
  ((select id from p), 0, 'hero', jsonb_build_object(
    'eyebrow', 'AI-First Fractional Leadership',
    'headline', '30% of Your Leads Aren''t Being',
    'accent', 'Contacted.',
    'sub', 'Aventary builds AI-first product strategies, fractional CPO/CTO leadership, and RevOps systems for non-tech companies — every lead contacted, every time.',
    'ctaLabel', 'Book a Call', 'ctaHref', '/appointments',
    'secondaryLabel', 'Our Approach', 'secondaryHref', '/about',
    'image', jsonb_build_object('src','https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80&auto=format&fit=crop','alt','Strategic Leadership'),
    'chip',  jsonb_build_object('icon','monitoring','title','RevOps Insight','body','AI-driven lead routing keeps every inbound contacted within minutes.')
  )),
  ((select id from p), 1, 'services', jsonb_build_object(
    'heading','Expert Guidance & Products',
    'sub','Senior product, AI, and revenue leadership — plus the tools and intelligence we''ve built to back it up.',
    'leadership', jsonb_build_object(
      'eyebrow','Leadership','title','Fractional CPO & Product Leadership',
      'body','We deliver technology leadership, so your team never has to figure out the tech stack alone.',
      'bullets', jsonb_build_array('Product roadmap acceleration','GTM strategy & execution'),
      'bgImage','https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=900&q=80&auto=format&fit=crop',
      'ctaLabel','Explore CPO services','ctaHref','/contact'
    ),
    'ai', jsonb_build_object(
      'eyebrow','Innovation','title','AI Strategy & RevOps',
      'body','AI-driven revenue operations and lead routing systems. Every lead contacted. Every time.',
      'icon','neurology','ctaLabel','Build Your Pipeline','ctaHref','/appointments'
    ),
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'eyebrow','Salesforce + Agentforce','title','Lead-to-Opportunity Framework',
        'body','Lead assignment from days to one minute. The operational framework from a Fortune 500 transformation, translated for Series A–C SaaS.',
        'icon','conversion_path','ctaLabel','See the framework','href','/lead-to-opp'),
      jsonb_build_object(
        'eyebrow','Daily Brief','title','Morning Intelligence Brief',
        'body','Top 5 signals across AI, Salesforce, and RevOps from 30+ voices — updated daily at 6 AM PT.',
        'icon','insights','ctaLabel','Read today''s brief','href','/intelligence'),
      jsonb_build_object(
        'eyebrow','Platform','title','RevOps Command Center',
        'body','The coordination layer for the AI tools your revenue team already uses.',
        'icon','hub','ctaLabel','Explore Command','href','/command'),
      jsonb_build_object(
        'eyebrow','Free Tool','title','Revenue Leak Detection Kit',
        'body','X-ray your pipeline and forecast from one CSV and see how much of your reported revenue you can actually trust.',
        'icon','troubleshoot','ctaLabel','Run the diagnostic','href','/diagnostics'),
      jsonb_build_object(
        'eyebrow','Writing','title','Insights',
        'body','Field notes on AI, RevOps, and building revenue systems that actually ship.',
        'icon','article','ctaLabel','Read insights','href','/insights'),
      jsonb_build_object(
        'eyebrow','Subscribe','title','Get the brief in your inbox',
        'body','One email each weekday at 6 AM PT. Unsubscribe in one click — no questions asked.',
        'icon','mark_email_unread','ctaLabel','Subscribe free','href','/intelligence#mb-subscribe')
    )
  )),
  ((select id from p), 2, 'stats', jsonb_build_object(
    'left', jsonb_build_object('metric','30%','label','of inbound leads are never contacted at most companies. We close that gap.','quote','Aventary didn''t just patch our pipeline — they rebuilt our revenue engine.'),
    'right',jsonb_build_object('metric','24h','label','Typical first response. We reply to every inquiry within one business day.','ctaLabel','Read our insights','ctaHref','/insights')
  )),
  ((select id from p), 3, 'why', jsonb_build_object(
    'heading','Why Aventary?',
    'image', jsonb_build_object('src','https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80&auto=format&fit=crop','alt','Boardroom'),
    'items', jsonb_build_array(
      jsonb_build_object('icon','psychology','title','AI-First by Design',
        'body','Every engagement starts with one question: where is your business losing leverage? Most of the time, the answer involves AI.'),
      jsonb_build_object('icon','speed','title','Operator Experience',
        'body','Roots at PwC and deep experience leading product and technology initiatives across industries. Executive clarity, embedded with your team.'),
      jsonb_build_object('icon','shield_with_heart','title','Built to Last',
        'body','We bring structure, speed, and strategy — and leave systems your team can run long after we''re gone.')
    )
  )),
  ((select id from p), 4, 'cta', jsonb_build_object(
    'headline','Ready to fix your','accent','lead pipeline?',
    'sub','Book a confidential strategy call. We reply within 24 hours.',
    'ctaLabel','Book a Call Now','ctaHref','/appointments'
  ))
on conflict do nothing;

-- ------------------------------------------------------------ ABOUT
insert into public.pages(slug, title, description)
values ('about', 'Who We Are', 'Aventary helps non-tech companies compete like tech companies — AI-first by design.')
on conflict (slug) do update set title = excluded.title, description = excluded.description;

with p as (select id from public.pages where slug = 'about')
insert into public.blocks(page_id, position, type, data) values
  ((select id from p), 0, 'hero', jsonb_build_object(
    'eyebrow','About Aventary','headline','Who We','accent','Are.',
    'sub','Executive-level product and technology leadership for companies ready to grow.',
    'image', jsonb_build_object('src','https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80&auto=format&fit=crop','alt','Team at work')
  )),
  ((select id from p), 1, 'rich_text', jsonb_build_object('md',
    E'Mendy Ezagui founded Aventary with one mission: help non-tech companies compete like tech companies. He assembled a team of operators, strategists, and technologists to make that happen at scale.\n\nWith roots at PwC and deep experience leading product and technology initiatives across industries, our team brings executive-level clarity and execution — without the full-time overhead.\n\nWe serve as Fractional CPO and Fractional CTO for founders and operators who need real leadership, not just another vendor. Every engagement starts with one question: where is your business losing leverage? Most of the time, the answer involves AI.\n\nAventary is AI-first by design. Whether it''s fixing a broken lead pipeline, streamlining operations, or building a product roadmap that actually ships — we bring structure, speed, and strategy to companies ready to grow.'
  )),
  ((select id from p), 2, 'cta', jsonb_build_object(
    'headline','Interested in working','accent','together?',
    'sub','Fill out some info and we will be in touch shortly.',
    'ctaLabel','Contact us','ctaHref','/contact'
  ))
on conflict do nothing;

-- ------------------------------------------------------------ CONTACT
insert into public.pages(slug, title, description)
values ('contact', 'Let''s Talk', 'Ready to fix your lead pipeline or explore what AI can do for your business?')
on conflict (slug) do update set title = excluded.title, description = excluded.description;

with p as (select id from public.pages where slug = 'contact')
insert into public.blocks(page_id, position, type, data) values
  ((select id from p), 0, 'hero', jsonb_build_object(
    'eyebrow','Reply within 24 hours','headline','Let''s','accent','Talk.',
    'sub','Ready to fix your lead pipeline or explore what AI can do for your business? Share a bit about where you are and what you''re working toward.'
  )),
  ((select id from p), 1, 'form_anchor', jsonb_build_object('source','contact'))
on conflict do nothing;

-- ------------------------------------------------------------ APPOINTMENTS
insert into public.pages(slug, title, description)
values ('appointments', 'Secure your spot', 'Transform your business landscape with our cutting-edge consulting approach.')
on conflict (slug) do update set title = excluded.title, description = excluded.description;

with p as (select id from public.pages where slug = 'appointments')
insert into public.blocks(page_id, position, type, data) values
  ((select id from p), 0, 'hero', jsonb_build_object(
    'eyebrow','Schedule a Call','headline','Secure your','accent','spot.',
    'sub','Transform your business landscape with our cutting-edge consulting approach. Schedule an appointment today and unlock insight-driven strategies tailored to reach new heights.'
  )),
  ((select id from p), 1, 'form_anchor', jsonb_build_object('source','appointments'))
on conflict do nothing;

-- ------------------------------------------------------------ FIRST POST
insert into public.posts(slug, title, excerpt, body_md, cover_url, published_at)
values (
  'why-30-of-your-leads-are-never-getting-contacted',
  'Why 30% of Your Leads Are Never Getting Contacted',
  'A short diagnosis of the gap between marketing spend and pipeline — and how AI-driven routing closes it.',
  E'## The gap between spend and pipeline\n\nMost teams don''t have a lead problem. They have a routing problem.\n\nWhen we audit inbound pipelines we find the same pattern: 20–40% of inbound leads are never called, emailed, or assigned — usually because of slow round-robin logic, territory rules that don''t match the data, or lead scoring that''s silently filtering real buyers out.\n\n## What to fix first\n\n1. Measure first-touch time on every lead.\n2. Add a safety net: any lead untouched after 2 hours goes to a pooled queue.\n3. Let AI classify intent and enrich before routing.\n\nContact us if you want a free pipeline review.',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80&auto=format&fit=crop',
  now()
) on conflict (slug) do nothing;
