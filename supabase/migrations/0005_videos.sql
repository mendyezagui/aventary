-- Aventary video library — the clip feed and its indexable watch pages.
--
-- Design note: every clip gets its own row here and its own URL at
-- /videos/<slug>. The scroll feed at /videos/feed is a *view* over these rows,
-- not a separate content store, so nothing is published that Google can't also
-- reach as a normal page. `transcript` is the column that actually earns the
-- search and AI-answer traffic — the video itself is opaque to a crawler.

-- ---------- videos ----------
create table if not exists public.videos (
  id               uuid primary key default uuid_generate_v4(),
  slug             text unique not null,
  title            text not null,
  description      text,
  -- Plain-text transcript, rendered into the watch page's HTML. This is what
  -- search engines and AI answer engines actually read.
  transcript       text,
  -- 'cloudflare_stream' → playback_id is the Stream video UID.
  -- 'file'              → source_url points at an .mp4/.m3u8 directly.
  -- 'youtube'           → playback_id is the YouTube video ID. Watch page works,
  --                       but the clip can't autoplay in the scroll feed (see
  --                       lib/videos.ts feedPlayable) and Google credits the
  --                       video to youtube.com, not to us.
  provider         text not null default 'cloudflare_stream'
                     check (provider in ('cloudflare_stream', 'file', 'youtube')),
  playback_id      text,                     -- Stream video UID, or YouTube video ID
  source_url       text,                     -- direct media URL (provider='file')
  thumbnail_url    text,                     -- override; else derived from playback_id
  duration_seconds int,
  orientation      text not null default 'vertical'
                     check (orientation in ('vertical', 'horizontal')),
  format           text not null default 'short'
                     check (format in ('short', 'long')),
  topics           text[] not null default '{}'::text[],
  -- Optional link to the Insights post this clip belongs with. Interlinking the
  -- two is what makes Google read the articles and the clips as one cluster
  -- rather than two unrelated piles of content.
  post_slug        text references public.posts(slug) on update cascade on delete set null,
  pinned           boolean not null default false,
  position         int not null default 0,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- A clip is playable only if we can build a URL for it.
  constraint videos_playable check (
    (provider in ('cloudflare_stream', 'youtube') and playback_id is not null)
    or (provider = 'file' and source_url is not null)
  ),
  -- /videos/feed is a real route; a clip may not claim that slug.
  constraint videos_slug_reserved check (slug not in ('feed'))
);

create index if not exists videos_published_idx
  on public.videos(published_at desc nulls last);
create index if not exists videos_feed_order_idx
  on public.videos(pinned desc, position asc, published_at desc);
create index if not exists videos_post_slug_idx
  on public.videos(post_slug);

-- ---------- chapters (long videos) ----------
-- Rendered as schema.org Clip parts, which is what produces the "Key moments"
-- jump-links under a video result.
create table if not exists public.video_chapters (
  id            uuid primary key default uuid_generate_v4(),
  video_id      uuid not null references public.videos(id) on delete cascade,
  title         text not null,
  start_seconds int not null check (start_seconds >= 0),
  end_seconds   int check (end_seconds is null or end_seconds > start_seconds),
  position      int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists video_chapters_video_idx
  on public.video_chapters(video_id, position);

-- ---------- updated_at trigger ----------
drop trigger if exists videos_touch on public.videos;
create trigger videos_touch before update on public.videos
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.videos         enable row level security;
alter table public.video_chapters enable row level security;

drop policy if exists "read published videos" on public.videos;
create policy "read published videos" on public.videos
  for select using (published_at is not null and published_at <= now());

drop policy if exists "read chapters of published videos" on public.video_chapters;
create policy "read chapters of published videos" on public.video_chapters
  for select using (
    exists (
      select 1 from public.videos v
      where v.id = video_chapters.video_id
        and v.published_at is not null
        and v.published_at <= now()
    )
  );

drop policy if exists "admin all videos" on public.videos;
create policy "admin all videos" on public.videos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all video_chapters" on public.video_chapters;
create policy "admin all video_chapters" on public.video_chapters
  for all using (public.is_admin()) with check (public.is_admin());
