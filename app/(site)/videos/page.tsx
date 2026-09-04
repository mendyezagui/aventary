import Link from "next/link";
import { clockDuration, listVideos, posterUrl, videoListJsonLd } from "@/lib/videos";

export const revalidate = 60;

const PAGE_URL = "https://aventary.com/videos";
const OG_IMAGE = "https://aventary.com/opengraph-image.png";
const TITLE = "Video — Aventary";
const DESCRIPTION =
  "Short clips and long walkthroughs on RevOps, Salesforce, AI, and pipeline diagnostics — every one with a full transcript.";

export const metadata = {
  title: "Video",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Aventary video library" }],
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE]
  }
};

/**
 * The crawlable index. Every published clip is a plain link from here, which is
 * how a crawler reaches the watch pages — it will never swipe through the feed.
 */
export default async function VideosPage() {
  const videos = await listVideos();
  const shorts = videos.filter((v) => v.format === "short");
  const longs = videos.filter((v) => v.format === "long");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoListJsonLd(videos)) }}
      />

      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center px-4 py-1.5 rounded-[2px] bg-primary-fixed text-on-primary-fixed font-label text-xs font-semibold tracking-[0.22em] uppercase mb-8">
            The Aventary Feed
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-medium editorial-gap leading-[1.05] mb-8">
            Video<span className="text-primary italic">.</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl">
            Short takes and full walkthroughs from live engagements. Every clip carries its
            transcript, so you can read it faster than you can watch it.
          </p>

          {videos.length ? (
            <Link
              href="/videos/feed"
              className="mt-10 inline-flex items-center gap-2 bg-ink text-inverse-on-surface px-8 py-4 rounded-full font-label font-bold text-sm hover:opacity-90 transition"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                swipe_up
              </span>
              Play the feed
            </Link>
          ) : null}
        </div>
      </section>

      {videos.length === 0 ? (
        <section className="px-8 pb-24">
          <div className="max-w-7xl mx-auto border border-outline-variant/40 rounded-xl p-12 text-center">
            <p className="text-on-surface-variant">
              No clips published yet. Add the first one from{" "}
              <Link href="/admin/videos" className="text-primary underline">
                the admin
              </Link>
              .
            </p>
          </div>
        </section>
      ) : null}

      {shorts.length ? <VideoSection heading="Shorts" videos={shorts} /> : null}
      {longs.length ? <VideoSection heading="Long form" videos={longs} /> : null}
    </>
  );
}

function VideoSection({ heading, videos }: { heading: string; videos: Awaited<ReturnType<typeof listVideos>> }) {
  return (
    <section className="px-8 pb-20">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-label text-xs font-semibold tracking-[0.22em] uppercase text-accent mb-8 border-b border-outline-variant/40 pb-6">
          {heading}
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const poster = posterUrl(v);
            const duration = clockDuration(v.duration_seconds);
            return (
              <Link
                key={v.slug}
                href={`/videos/${v.slug}`}
                className="group bg-surface-container-lowest rounded-xl border border-outline-variant/40 overflow-hidden hover:border-primary/40 hover:-translate-y-1 transition-all"
              >
                <div
                  className={`relative overflow-hidden bg-ink ${
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
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                      <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
                        play_arrow
                      </span>
                    </span>
                  </span>
                  {duration ? (
                    <span className="absolute bottom-3 right-3 rounded bg-black/65 px-2 py-0.5 font-label text-[11px] tabular-nums text-white">
                      {duration}
                    </span>
                  ) : null}
                </div>
                <div className="p-6">
                  {v.topics.length ? (
                    <div className="mb-2 font-label text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
                      {v.topics.join(" · ")}
                    </div>
                  ) : null}
                  <h3 className="font-headline text-lg font-semibold leading-snug">{v.title}</h3>
                  {v.description ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
                      {v.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
