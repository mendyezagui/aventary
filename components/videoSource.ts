"use client";

/**
 * Attaching a media source to a <video>, in the two shapes we ship.
 *
 * Cloudflare Stream delivers HLS. Safari plays that natively; every other
 * browser needs hls.js, which is ~100kB gzipped — so it is imported lazily and
 * only in the browsers that actually need it, and never at all for plain files.
 */

export type DetachSource = () => void;

function playsHlsNatively(video: HTMLVideoElement): boolean {
  return video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

/**
 * Points `video` at `src` and returns a teardown function. Calling teardown
 * releases the buffer, which is what keeps a long feed from holding tens of
 * megabytes of decoded video for slides the viewer has already passed.
 */
export function attachSource(video: HTMLVideoElement, src: string): DetachSource {
  const isHls = src.includes(".m3u8");

  if (!isHls || playsHlsNatively(video)) {
    video.src = src;
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }

  let cancelled = false;
  let hls: { destroy: () => void } | null = null;

  void import("hls.js").then(({ default: Hls }) => {
    if (cancelled) return;
    if (!Hls.isSupported()) {
      video.src = src; // nothing better to try
      return;
    }
    const instance = new Hls({
      capLevelToPlayerSize: true,
      // A feed only ever needs the next few seconds of the clip on screen.
      maxBufferLength: 15,
      maxMaxBufferLength: 30
    });
    instance.loadSource(src);
    instance.attachMedia(video);
    hls = instance;
  });

  return () => {
    cancelled = true;
    if (hls) {
      hls.destroy();
      hls = null;
    } else {
      video.removeAttribute("src");
      video.load();
    }
  };
}

/** Browsers reject autoplay in cases we can't predict; never let it throw. */
export function tryPlay(video: HTMLVideoElement): void {
  const p = video.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
