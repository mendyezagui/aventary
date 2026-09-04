"use client";

import { useEffect, useRef, useState } from "react";
import { attachSource, type DetachSource } from "./videoSource";

export type WatchChapter = {
  title: string;
  start_seconds: number;
  end_seconds: number | null;
};

function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/**
 * The player on a watch page. Full controls, no autoplay — someone who landed
 * here from search chose this clip, so it waits for them.
 *
 * Chapters double as the page's own jump-links and as the `Clip` parts in the
 * page's structured data, which is what Google turns into "Key moments".
 */
export default function WatchPlayer({
  src,
  embed,
  poster,
  title,
  orientation,
  chapters = []
}: {
  src: string | null;
  embed: string | null;
  poster: string | null;
  title: string;
  orientation: "vertical" | "horizontal";
  chapters?: WatchChapter[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detachRef = useRef<DetachSource | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    detachRef.current = attachSource(video, src);

    // Deep links from chapter markup and shared timestamps: /videos/x?t=120
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    if (Number.isFinite(t) && t > 0) {
      const seek = () => {
        video.currentTime = t;
      };
      if (video.readyState >= 1) {
        seek();
      } else {
        video.addEventListener("loadedmetadata", seek, { once: true });
      }
    }

    return () => {
      detachRef.current?.();
      detachRef.current = null;
    };
  }, [src]);

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  const frame =
    orientation === "vertical"
      ? "mx-auto w-full max-w-[420px] aspect-[9/16]"
      : "w-full aspect-video";

  const activeChapter = chapters.reduce<number>((acc, c, i) => {
    return currentTime >= c.start_seconds ? i : acc;
  }, -1);

  return (
    <div>
      <div className={`${frame} overflow-hidden rounded-2xl bg-ink soft-lift`}>
        {src ? (
          <video
            ref={videoRef}
            poster={poster ?? undefined}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            className="h-full w-full object-contain"
          />
        ) : embed ? (
          <iframe
            src={embed}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
            This clip has no playable source yet.
          </div>
        )}
      </div>

      {chapters.length ? (
        <div className="mt-6">
          <h2 className="mb-3 font-label text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            Chapters
          </h2>
          <ol className="divide-y divide-outline-variant/40 border-y border-outline-variant/40">
            {chapters.map((c, i) => (
              <li key={`${c.start_seconds}-${c.title}`}>
                <button
                  type="button"
                  onClick={() => seekTo(c.start_seconds)}
                  disabled={!src}
                  className={`flex w-full items-baseline gap-4 py-3 text-left transition-colors hover:text-primary disabled:cursor-default disabled:hover:text-inherit ${
                    i === activeChapter ? "text-primary" : ""
                  }`}
                >
                  <span className="font-label text-xs tabular-nums text-on-surface-variant">
                    {clock(c.start_seconds)}
                  </span>
                  <span className="text-sm font-medium">{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
