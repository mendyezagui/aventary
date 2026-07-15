import Link from "next/link";
import { listPosts } from "@/lib/cms";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "";
  }
}

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
    cover_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80&auto=format&fit=crop",
    published_at: new Date().toISOString(),
    track: "exclusive",
    pinned: false
  }
];

const TRACK_LABEL: Record<string, string> = {
  exclusive: "Aventary Exclusive",
  external: "From the Field"
};

function PostCard({ p, featured = false }: { p: any; featured?: boolean }) {
  return (
    <Link
      href={`/insights/${p.slug}`}
      className="group bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/40 hover:border-primary/40 hover:-translate-y-1 transition-all block"
    >
      {p.cover_url ? (
        <div className="aspect-[16/9] rounded-lg overflow-hidden mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.cover_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : null}
      <div className="text-accent font-label font-semibold text-[11px] tracking-[0.22em] uppercase mb-3 flex items-center gap-2">
        <span>{TRACK_LABEL[p.track] ?? "Insights"}</span>
        {p.published_at ? (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={p.published_at}>{formatDate(p.published_at)}</time>
          </>
        ) : null}
      </div>
      <h2 className={`font-headline ${featured ? "text-3xl" : "text-2xl"} font-semibold mb-3`}>
        {p.title}
      </h2>
      {p.excerpt ? (
        <p className="text-on-surface-variant text-sm leading-relaxed">{p.excerpt}</p>
      ) : null}
    </Link>
  );
}

function TrackSection({
  eyebrow,
  title,
  blurb,
  posts
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  posts: any[];
}) {
  if (!posts.length) return null;
  return (
    <section className="px-8 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="text-accent font-label font-semibold text-xs tracking-[0.22em] uppercase mb-3">
            {eyebrow}
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-medium mb-3">{title}</h2>
          <p className="text-on-surface-variant max-w-2xl">{blurb}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {posts.map((p) => (
            <PostCard key={p.slug} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function InsightsPage() {
  const posts = await listPosts();
  const list: any[] = posts.length ? posts : FALLBACK;

  const featured = list.filter((p) => p.pinned);
  const rest = list.filter((p) => !p.pinned);
  const exclusive = rest.filter((p) => p.track !== "external");
  const external = rest.filter((p) => p.track === "external");

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
        </div>
      </section>

      {featured.length ? (
        <section className="px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-accent font-label font-semibold text-xs tracking-[0.22em] uppercase mb-6">
              Featured
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {featured.map((p) => (
                <PostCard key={p.slug} p={p} featured />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <TrackSection
        eyebrow="Track 01"
        title="Aventary Exclusive"
        blurb="Original frameworks, field notes, and analysis from our own engagements — written by the people who built the systems."
        posts={exclusive}
      />

      <TrackSection
        eyebrow="Track 02"
        title="From the Field"
        blurb="Signals we're tracking across AI, Salesforce, and RevOps — third-party research, releases, and takes, with our read on what actually matters."
        posts={external}
      />
    </>
  );
}
