import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/cms";

export const revalidate = 60;

const FALLBACK_POST = {
  slug: "why-30-of-your-leads-are-never-getting-contacted",
  title: "Why 30% of Your Leads Are Never Getting Contacted",
  excerpt:
    "A short diagnosis of the gap between marketing spend and pipeline — and how AI-driven routing closes it.",
  cover_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80&auto=format&fit=crop",
  body_md:
    "## The gap between spend and pipeline\n\nMost teams don't have a lead problem. They have a routing problem.\n\nWhen we audit inbound pipelines we find the same pattern: 20–40% of inbound leads are never called, emailed, or assigned — usually because of slow round-robin logic, territory rules that don't match the data, or lead scoring that's silently filtering real buyers out.\n\n## What to fix first\n\n1. Measure first-touch time on every lead.\n2. Add a safety net: any lead untouched after 2 hours goes to a pooled queue.\n3. Let AI classify intent and enrich before routing.\n\nContact us if you want a free pipeline review."
};

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post = await getPost(slug);
  if (!post && slug === FALLBACK_POST.slug) post = FALLBACK_POST as any;
  if (!post) notFound();

  return (
    <>
      <section className="px-8 pt-24 pb-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/insights"
            className="text-primary font-label font-bold text-xs tracking-widest uppercase"
          >
            ← Insights
          </Link>
          <h1 className="font-headline text-4xl md:text-6xl font-bold editorial-gap leading-[1.05] mt-6 mb-6">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-lg text-on-surface-variant">{post.excerpt}</p>
          ) : null}
        </div>
      </section>

      {post.cover_url ? (
        <section className="px-8 pb-12">
          <div className="max-w-3xl mx-auto rounded-3xl overflow-hidden soft-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_url} alt="" className="w-full aspect-[16/9] object-cover" />
          </div>
        </section>
      ) : null}

      <section className="px-8 pb-24">
        <article className="max-w-3xl mx-auto space-y-6 text-lg leading-relaxed text-on-surface">
          {(post.body_md ?? "").split(/\n{2,}/).map((b: string, i: number) => {
            if (b.startsWith("## ")) {
              return <h2 key={i} className="font-headline text-2xl md:text-3xl font-bold pt-4">{b.slice(3)}</h2>;
            }
            if (/^\d+\.\s/.test(b)) {
              const items = b.split(/\n/).filter(Boolean);
              return (
                <ol key={i} className="list-decimal pl-6 space-y-2">
                  {items.map((it, j) => <li key={j}>{it.replace(/^\d+\.\s/, "")}</li>)}
                </ol>
              );
            }
            return <p key={i}>{b}</p>;
          })}
          <div className="pt-8">
            <Link
              href="/contact"
              className="bg-primary text-on-primary px-8 py-4 rounded-full font-label font-bold hover:opacity-90 transition inline-flex items-center gap-2"
            >
              Get a free pipeline review
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </article>
      </section>
    </>
  );
}
