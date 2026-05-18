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
export const metadata = { title: "Insights" };

const FALLBACK = [
  {
    slug: "why-30-of-your-leads-are-never-getting-contacted",
    title: "Why 30% of Your Leads Are Never Getting Contacted",
    excerpt:
      "A short diagnosis of the gap between marketing spend and pipeline — and how AI-driven routing closes it.",
    cover_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80&auto=format&fit=crop",
    published_at: new Date().toISOString()
  }
];

export default async function InsightsPage() {
  const posts = await listPosts();
  const list = posts.length ? posts : FALLBACK;

  return (
    <>
      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
            The Aventary Journal
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-bold editorial-gap leading-[1.05] mb-8">
            Insights<span className="text-primary italic">.</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl">
            Notes from the team on AI, RevOps, and product leadership.
          </p>
        </div>
      </section>

      <section className="px-8 pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {list.map((p: any) => (
            <Link
              key={p.slug}
              href={`/insights/${p.slug}`}
              className="group bg-surface-container-lowest p-8 rounded-3xl soft-lift block"
            >
              {p.cover_url ? (
                <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.cover_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : null}
              <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3 flex items-center gap-2">
                <span>Insights</span>
                {p.published_at ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={p.published_at}>{formatDate(p.published_at)}</time>
                  </>
                ) : null}
              </div>
              <h2 className="font-headline text-2xl font-bold mb-3">{p.title}</h2>
              {p.excerpt ? <p className="text-on-surface-variant">{p.excerpt}</p> : null}
            </Link>
          ))}

          {list.length === 1 ? (
            <div className="bg-primary text-on-primary p-10 rounded-3xl flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="font-label font-bold text-xs tracking-widest uppercase opacity-80 mb-3">
                  Coming soon
                </div>
                <h2 className="font-headline text-3xl font-bold mb-3">
                  Lead-routing playbooks for non-tech teams
                </h2>
                <p className="opacity-80">
                  A practical series on instrumenting your inbound, scoring leads with AI, and shrinking
                  first-touch time below 5 minutes.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-15">
                <span className="material-symbols-outlined text-[12rem]">trending_up</span>
              </div>
              <Link
                href="/contact"
                className="bg-surface-container-lowest text-primary px-6 py-3 rounded-full font-bold w-fit mt-8 relative z-10"
              >
                Get notified
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
