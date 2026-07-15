import InsightsFilter from "@/components/InsightsFilter";
import { listPosts } from "@/lib/cms";

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
  const posts = await listPosts();
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
        </div>
      </section>

      <InsightsFilter posts={list} />
    </>
  );
}
