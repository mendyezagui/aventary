import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getPost } from "@/lib/cms";

export const revalidate = 60;

const FALLBACK_POST = {
  slug: "why-30-of-your-leads-are-never-getting-contacted",
  title: "Why 30% of Your Leads Are Never Getting Contacted",
  excerpt:
    "A short diagnosis of the gap between marketing spend and pipeline — and how AI-driven routing closes it.",
  cover_url:
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80&auto=format&fit=crop",
  body_md:
    "## The gap between spend and pipeline\n\nMost teams don't have a lead problem. They have a routing problem.\n\nWhen we audit inbound pipelines we find the same pattern: 20–40% of inbound leads are never called, emailed, or assigned — usually because of slow round-robin logic, territory rules that don't match the data, or lead scoring that's silently filtering real buyers out.\n\n## What to fix first\n\n1. Measure first-touch time on every lead.\n2. Add a safety net: any lead untouched after 2 hours goes to a pooled queue.\n3. Let AI classify intent and enrich before routing.\n\nContact us if you want a free pipeline review."
};

async function loadPost(slug: string) {
  const fromDb = await getPost(slug);
  if (fromDb) return fromDb;
  if (slug === FALLBACK_POST.slug) return FALLBACK_POST;
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "Not found — Aventary" };
  return {
    title: post.title + " — Aventary",
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
      type: "article" as const
    },
    twitter: {
      card: post.cover_url ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.cover_url ? [post.cover_url] : undefined
    }
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  // Posts are written by allowlisted admins (lib/admin.ts). If you ever open
  // authoring to untrusted users, sanitize via DOMPurify or marked’s sanitizer.
  const html = (await marked.parse(post.body_md ?? "")) as string;

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
            <img
              src={post.cover_url}
              alt=""
              className="w-full aspect-[16/9] object-cover"
            />
          </div>
        </section>
      ) : null}

      <section className="px-8 pb-24">
        <article
          className="max-w-3xl mx-auto text-lg leading-relaxed text-on-surface [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:pt-8 [&_h2]:mb-3 [&_h3]:font-headline [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:font-bold [&_h3]:pt-6 [&_h3]:mb-3 [&_p]:my-5 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-5 [&_ul>li]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-5 [&_ol>li]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6 [&_code]:bg-black/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-black/90 [&_pre]:text-white [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_img]:rounded-2xl [&_img]:my-6 [&_img]:w-full [&_strong]:font-bold [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="max-w-3xl mx-auto pt-8">
          <Link
            href="/contact"
            className="bg-primary text-on-primary px-8 py-4 rounded-full font-label font-bold hover:opacity-90 transition inline-flex items-center gap-2"
          >
            Get a free pipeline review
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    </>
  );
}
