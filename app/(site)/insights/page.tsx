import InsightsFilter from "@/components/InsightsFilter";
import VideoStrip from "@/components/VideoStrip";
import { listPosts } from "@/lib/cms";
import { listVideos } from "@/lib/videos";

export const revalidate = 60;

const OG_IMAGE = "https://aventary.com/og-insights.png";
const PAGE_URL = "https://aventary.com/insights";
const TITLE = "Insights — Aventary";
const DESCRIPTION =
  "The Aventary Journal — notes from the team on AI, Salesforce, Revenue Operations, and product leadership. Long-form analysis from builders, not theory.";

export const metadata = {
  title: "Insights",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Aventary Insights — notes on AI, Salesforce, and RevOps"
      }
    ],
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE]
  }
};

const FALLBACK = [
  {
    slug: "why-30-of-your-leads-are-never-getting-contacted",
    title: "Why 30% of Your Leads Are Never Getting Contacted",
    excerpt:
      "A short diagnosis of the gap between marketing spend and pipeline — and how AI-driven routing closes it.",
    cover_url:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80&auto=format&fit=crop",
    published_at: new Date().toISOString(),
    track: "exclusive",
    pinned: false
  }
];

export default async function InsightsPage() {
  const [posts, videos] = await Promise.all([listPosts(), listVideos()]);
  const list: any[] = posts.length ? posts : FALLBACK;

  return (
    <>
      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center px-4 py-1.5 rounded-[2px] bg-primary-fixed text-on-primary-fixed font-label text-xs font-semibold tracking-[0.22em] uppercase mb-8">
            The Aventary Journal
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-medium editorial-gap leading-[1.05] mb-8">
            Insights<span className="text-primary italic">.</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl">
            Two tracks: original frameworks from our own engagements, and the signals we track
            from the wider field.
          </p>

          {/* Watch or read — the two ways through this page, offered before either
              starts. Plain anchors, so both bodies of content stay in the DOM for
              crawlers rather than hiding behind a tab. */}
          {videos.length ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 max-w-3xl">
              <SwitchCard
                href="#watch"
                label="Watch"
                count={`${videos.length} ${videos.length === 1 ? "clip" : "clips"}`}
                blurb="Short takes, ninety seconds each."
              />
              <SwitchCard
                href="#read"
                label="Read"
                count={`${list.length} ${list.length === 1 ? "article" : "articles"}`}
                blurb="Long-form analysis from the work."
              />
            </div>
          ) : null}
        </div>
      </section>

      <div id="watch" className="scroll-mt-24">
        <VideoStrip
          videos={videos.slice(0, 8)}
          heading="Watch"
          subheading="The same thinking in ninety seconds. Every clip has a transcript."
        />
      </div>

      <div id="read" className="scroll-mt-24">
        <InsightsFilter posts={list} />
      </div>
    </>
  );
}

/** One of the two "how do you want this" cards at the top of the page. */
function SwitchCard({
  href,
  label,
  count,
  blurb
}: {
  href: string;
  label: string;
  count: string;
  blurb: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center justify-between gap-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-headline text-2xl font-semibold group-hover:text-primary transition-colors">
          {label}
        </span>
        <span className="mt-1 block font-label text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          {count}
        </span>
        <span className="mt-2 block text-sm text-on-surface-variant">{blurb}</span>
      </span>
      <span
        aria-hidden="true"
        className="material-symbols-outlined shrink-0 text-on-surface-variant transition-transform group-hover:translate-y-1 group-hover:text-primary"
      >
        arrow_downward
      </span>
    </a>
  );
}
