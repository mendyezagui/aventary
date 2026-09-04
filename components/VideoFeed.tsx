"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { attachSource, prefersReducedMotion, tryPlay, type DetachSource } from "./videoSource";

export type FeedItem = {
  slug: string;
  title: string;
  description: string | null;
  poster: string | null;
  /** Direct media URL. Null for clips that can only run inside an iframe. */
  src: string | null;
  /** Third-party player URL, used when `src` is null (YouTube-backed clips). */
  embed: string | null;
  orientation: "vertical" | "horizontal";
  duration: string | null;
  topics: string[];
  postSlug: string | null;
};

/** Slides either side of the active one that keep a loaded media source. */
const PRELOAD_WINDOW = 1;

/**
 * The phone-first clip feed: one video per viewport, scroll-snapped, the active
 * one playing muted until the viewer asks for sound.
 *
 * Two things here are load-bearing beyond the obvious:
 *
 *  - Only three clips ever hold a media source at once. Everything else is a
 *    poster image, so a hundred-clip feed costs about what three clips cost.
 *  - Every slide contains its real title and a real link to /videos/<slug>.
 *    The feed is `noindex`, but a crawler that follows it still reaches every
 *    watch page, and a viewer who shares the URL shares the indexable page.
 */
export default function VideoFeed({
  items,
  startSlug
}: {
  items: FeedItem[];
  startSlug?: string;
}) {
  const initial = Math.max(
    0,
    items.findIndex((i) => i.slug === startSlug)
  );

  const [active, setActive] = useState(initial);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openEmbed, setOpenEmbed] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const detachRefs = useRef<(DetachSource | null)[]>([]);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
  }, []);

  const goTo = useCallback((index: number) => {
    const el = slideRefs.current[index];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Land on the requested clip without animating past everything before it.
  useEffect(() => {
    if (initial > 0) slideRefs.current[initial]?.scrollIntoView({ block: "start" });
    // Deliberately mount-only: later changes are driven by scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which slide is on screen. Full-height snap slides mean at most one clears
  // 60%, so the last one to do so is unambiguously the active clip.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isFinite(index)) setActive(index);
        }
      },
      { root, threshold: 0.6 }
    );
    for (const el of slideRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [items.length]);

  // Load sources near the active slide, release everything else, and drive
  // playback. This is the only place play/pause is decided.
  useEffect(() => {
    items.forEach((item, i) => {
      const video = videoRefs.current[i];
      if (!video) return;

      const near = Math.abs(i - active) <= PRELOAD_WINDOW;
      if (near && item.src && !detachRefs.current[i]) {
        detachRefs.current[i] = attachSource(video, item.src);
      } else if (!near && detachRefs.current[i]) {
        video.pause();
        detachRefs.current[i]?.();
        detachRefs.current[i] = null;
      }

      if (i === active) {
        video.muted = muted;
        if (!paused && !reducedRef.current) tryPlay(video);
      } else if (!video.paused) {
        video.pause();
      }
    });
  }, [active, items, muted, paused]);

  // Leaving the feed must not leave buffers behind. The feed covers the page,
  // so the document behind it must not scroll underneath the snap container.
  useEffect(() => {
    const detachers = detachRefs.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      detachers.forEach((detach) => detach?.());
    };
  }, []);

  // Reset transient per-clip state when the active clip changes.
  useEffect(() => {
    setProgress(0);
    setPaused(false);
    setOpenEmbed(null);
  }, [active]);

  // Shareable URL without a history entry per swipe — pushState here would mean
  // twenty back-presses to leave the feed.
  useEffect(() => {
    const item = items[active];
    if (!item) return;
    const path = `/videos/${item.slug}`;
    if (window.location.pathname !== path) {
      window.history.replaceState(null, "", path);
    }
    document.title = `${item.title} — Aventary`;
  }, [active, items]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goTo(Math.min(active + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(Math.max(active - 1, 0));
      } else if (e.key === "m") {
        setMuted((m) => !m);
      } else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items.length, goTo]);

  function togglePlayback(index: number) {
    const video = videoRefs.current[index];
    if (!video) return;
    if (video.paused) {
      setPaused(false);
      tryPlay(video);
    } else {
      setPaused(true);
      video.pause();
    }
  }

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-ink text-inverse-on-surface flex items-center justify-center px-8">
        <div className="text-center">
          <p className="font-headline text-2xl mb-4">No clips published yet.</p>
          <Link href="/videos" className="text-primary font-label text-xs tracking-[0.18em] uppercase">
            Back to the library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-ink text-inverse-on-surface">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link
          href="/videos"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-label text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur hover:text-white"
        >
          <span aria-hidden="true">←</span> Library
        </Link>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-pressed={!muted}
          className="pointer-events-auto rounded-full bg-black/40 p-2.5 text-white/85 backdrop-blur hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {muted ? "volume_off" : "volume_up"}
          </span>
          <span className="sr-only">{muted ? "Unmute" : "Mute"}</span>
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="av-no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {items.map((item, i) => {
          const isActive = i === active;
          return (
            <section
              key={item.slug}
              data-index={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden"
              aria-label={item.title}
            >
              {item.poster ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.poster}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
                />
              ) : null}

              {item.src ? (
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el;
                  }}
                  poster={item.poster ?? undefined}
                  playsInline
                  muted={muted}
                  preload="none"
                  onClick={() => togglePlayback(i)}
                  onTimeUpdate={
                    isActive
                      ? (e) => {
                          const v = e.currentTarget;
                          if (v.duration > 0) setProgress(v.currentTime / v.duration);
                        }
                      : undefined
                  }
                  onEnded={isActive ? () => goTo(Math.min(i + 1, items.length - 1)) : undefined}
                  className="relative h-full w-full cursor-pointer object-contain"
                />
              ) : openEmbed === item.slug && item.embed ? (
                <iframe
                  src={`${item.embed}?autoplay=1&rel=0&playsinline=1`}
                  title={item.title}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={`relative ${
                    item.orientation === "vertical" ? "h-full w-full max-w-[56.25vh]" : "aspect-video w-full"
                  }`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenEmbed(item.slug)}
                  className="relative flex h-full w-full items-center justify-center"
                >
                  {item.poster ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.poster} alt="" className="absolute inset-0 h-full w-full object-contain" />
                  ) : null}
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary">
                    <span className="material-symbols-outlined text-[32px]" aria-hidden="true">
                      play_arrow
                    </span>
                  </span>
                  <span className="sr-only">Play {item.title}</span>
                </button>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pt-20 pb-[calc(3.25rem+env(safe-area-inset-bottom))]">
                <div className="pointer-events-auto mx-auto max-w-2xl">
                  {item.topics.length ? (
                    <div className="mb-3 font-label text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                      {item.topics.join(" · ")}
                      {item.duration ? <span className="text-white/50"> · {item.duration}</span> : null}
                    </div>
                  ) : null}
                  <h2 className="font-headline text-xl font-semibold leading-snug text-white md:text-2xl">
                    {item.title}
                  </h2>
                  {item.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/70">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-4 font-label text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <Link href={`/videos/${item.slug}`} className="text-primary hover:text-white">
                      Full page &amp; transcript
                    </Link>
                    {item.postSlug ? (
                      <Link href={`/insights/${item.postSlug}`} className="text-white/60 hover:text-white">
                        Read the article
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              {isActive ? (
                <div className="absolute inset-x-0 z-20 h-0.5 bg-white/15 bottom-[env(safe-area-inset-bottom)]">
                  <div
                    className="h-full bg-primary transition-[width] duration-150 ease-linear"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="pointer-events-none absolute right-4 z-20 bottom-[calc(1rem+env(safe-area-inset-bottom))] font-label text-[11px] tracking-[0.18em] text-white/40">
        {active + 1} / {items.length}
      </div>
    </div>
  );
}
