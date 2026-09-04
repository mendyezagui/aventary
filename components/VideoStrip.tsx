import Link from "next/link";
import { clockDuration, posterUrl, type Video } from "@/lib/videos";

/**
 * A horizontal row of clips, dropped into the Insights index and into posts
 * that have clips attached.
 *
 * Every card is a real link to a watch page. Cross-linking articles and clips in
 * both directions is what makes search engines read them as one topic cluster
 * rather than two unrelated piles of content on the same domain.
 */
export default function VideoStrip({
  videos,
  heading = "Watch",
  subheading,
  showFeedLink = true
}: {
  videos: Video[];
  heading?: string;
  subheading?: string;
  showFeedLink?: boolean;
}) {
  if (!videos.length) return null;

  return (
    <section className="px-8 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-variant/40 pb-6 mb-8">
          <div>
            <h2 className="font-label text-xs font-semibold tracking-[0.22em] uppercase text-accent">
              {heading}
            </h2>
            {subheading ? (
              <p className="mt-2 text-on-surface-variant text-sm max-w-xl">{subheading}</p>
            ) : null}
          </div>
          {showFeedLink ? (
            <Link
              href="/videos/feed"
              className="inline-flex items-center gap-2 font-label text-[11px] font-semibold uppercase tracking-[0.18em] text-primary hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                swipe_up
              </span>
              Play the feed
            </Link>
          ) : null}
        </div>

        <div className="av-no-scrollbar -mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-2">
          {videos.map((v) => {
            const poster = posterUrl(v);
            const duration = clockDuration(v.duration_seconds);
            return (
              <Link
                key={v.slug}
                href={`/videos/${v.slug}`}
                className="group w-[220px] shrink-0 snap-start"
              >
                <div
                  className={`relative overflow-hidden rounded-xl bg-ink border border-outline-variant/40 group-hover:border-primary/40 transition-colors ${
                    v.orientation === "vertical" ? "aspect-[9/16]" : "aspect-video"
                  }`}
                >
                  {poster ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={poster}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                      <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                        play_arrow
                      </span>
                    </span>
                  </span>
                  {duration ? (
                    <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 font-label text-[10px] tabular-nums text-white">
                      {duration}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 font-headline text-sm leading-snug group-hover:text-primary transition-colors">
                  {v.title}
                </h3>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
