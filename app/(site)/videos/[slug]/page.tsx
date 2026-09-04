import Link from "next/link";
import { notFound } from "next/navigation";
import WatchPlayer from "@/components/WatchPlayer";
import { getPost } from "@/lib/cms";
import {
  SITE_URL,
  clockDuration,
  embedUrl,
  getVideo,
  listVideos,
  mediaUrl,
  posterUrl,
  videoObjectJsonLd,
  watchUrl
} from "@/lib/videos";

export const revalidate = 60;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = await getVideo(slug);
  if (!video) return { title: "Not found — Aventary" };

  const url = watchUrl(video);
  const poster = posterUrl(video);
  const media = mediaUrl(video);
  const description = video.description ?? video.title;

  return {
    title: video.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "video.other" as const,
      url,
      siteName: "Aventary",
      title: video.title,
      description,
      images: poster ? [poster] : undefined,
      videos: media
        ? [{ url: media, type: media.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4" }]
        : undefined,
      locale: "en_US"
    },
    twitter: {
      card: "player" as const,
      title: video.title,
      description,
      images: poster ? [poster] : undefined
    }
  };
}

/**
 * The indexable surface. One clip, its own URL, server-rendered, with the
 * transcript in the HTML — a crawler can read everything this page is about
 * without playing a frame, which is the entire point of the architecture.
 */
export default async function VideoWatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = await getVideo(slug);
  if (!video) notFound();

  const all = await listVideos();
  const index = all.findIndex((v) => v.slug === video.slug);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;
  const related = all.filter((v) => v.slug !== video.slug).slice(0, 3);

  const post = video.post_slug ? await getPost(video.post_slug) : null;
  const duration = clockDuration(video.duration_seconds);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Video", item: `${SITE_URL}/videos` },
      { "@type": "ListItem", position: 2, name: video.title, item: watchUrl(video) }
    ]
  };

  const transcriptParagraphs = (video.transcript ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObjectJsonLd(video)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <section className="px-8 pt-24 pb-10">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/videos"
            className="text-primary font-label font-bold text-xs tracking-widest uppercase"
          >
            ← Video
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 font-label text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            {video.topics.length ? <span>{video.topics.join(" · ")}</span> : null}
            {video.published_at ? (
              <>
                {video.topics.length ? <span aria-hidden="true">·</span> : null}
                <time dateTime={video.published_at} className="text-on-surface-variant">
                  {formatDate(video.published_at)}
                </time>
              </>
            ) : null}
            {duration ? (
              <>
                <span aria-hidden="true" className="text-on-surface-variant">
                  ·
                </span>
                <span className="text-on-surface-variant tabular-nums">{duration}</span>
              </>
            ) : null}
          </div>

          <h1 className="font-headline text-3xl md:text-5xl font-medium editorial-gap leading-[1.1] mt-4 mb-6">
            {video.title}
          </h1>
          {video.description ? (
            <p className="text-lg text-on-surface-variant max-w-3xl">{video.description}</p>
          ) : null}
        </div>
      </section>

      <section className="px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <WatchPlayer
            src={mediaUrl(video)}
            embed={embedUrl(video)}
            poster={posterUrl(video)}
            title={video.title}
            orientation={video.orientation}
            chapters={video.chapters ?? []}
          />

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/videos/feed?v=${video.slug}`}
              className="inline-flex items-center gap-2 bg-ink text-inverse-on-surface px-6 py-3 rounded-full font-label font-bold text-xs tracking-[0.12em] uppercase hover:opacity-90 transition"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                swipe_up
              </span>
              Play in the feed
            </Link>
            {post ? (
              <Link
                href={`/insights/${post.slug}`}
                className="inline-flex items-center gap-2 border border-outline-variant/60 px-6 py-3 rounded-full font-label font-bold text-xs tracking-[0.12em] uppercase hover:border-primary/60 transition"
              >
                Read: {post.title}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {transcriptParagraphs.length ? (
        <section className="px-8 pb-16">
          <div className="max-w-3xl mx-auto">
            {/* Open by default and plainly in the DOM. This block is what search
                engines and AI answer engines actually read — the video itself is
                opaque to them. */}
            <details open className="border-t border-outline-variant/40 pt-8">
              <summary className="cursor-pointer font-label text-[11px] font-semibold uppercase tracking-[0.22em] text-accent marker:content-none [&::-webkit-details-marker]:hidden">
                Transcript
              </summary>
              <div className="mt-6 space-y-5 text-lg leading-relaxed text-on-surface">
                {transcriptParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </details>
          </div>
        </section>
      ) : null}

      {previous || next ? (
        <section className="px-8 pb-12">
          <div className="max-w-5xl mx-auto grid gap-4 sm:grid-cols-2 border-t border-outline-variant/40 pt-8">
            {previous ? (
              <Link href={`/videos/${previous.slug}`} className="group">
                <div className="font-label text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant mb-2">
                  ← Previous
                </div>
                <div className="font-headline text-lg group-hover:text-primary transition-colors">
                  {previous.title}
                </div>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/videos/${next.slug}`} className="group sm:text-right">
                <div className="font-label text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant mb-2">
                  Next →
                </div>
                <div className="font-headline text-lg group-hover:text-primary transition-colors">
                  {next.title}
                </div>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="px-8 pb-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-label text-xs font-semibold tracking-[0.22em] uppercase text-accent mb-8">
              More from the feed
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {related.map((v) => {
                const poster = posterUrl(v);
                return (
                  <Link
                    key={v.slug}
                    href={`/videos/${v.slug}`}
                    className="group rounded-xl overflow-hidden border border-outline-variant/40 hover:border-primary/40 transition-colors"
                  >
                    <div
                      className={`bg-ink overflow-hidden ${
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
                    </div>
                    <div className="p-4 font-headline text-sm leading-snug">{v.title}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
