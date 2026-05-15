import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export default async function AdminEditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: post } = await supabase
    .from("posts")
    .select("id,slug,title,excerpt,body_md,cover_url,published_at")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  async function savePost(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const id = String(formData.get("id"));
    const oldSlug = String(formData.get("oldSlug"));
    const title = String(formData.get("title") ?? "").trim();
    const slugRaw = String(formData.get("slug") ?? "").trim();
    const slug = slugify(slugRaw || title);
    const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
    const cover_url = String(formData.get("cover_url") ?? "").trim() || null;
    const body_md = String(formData.get("body_md") ?? "");
    const wantPublished = formData.get("published") === "on";

    const { data: current } = await supabase
      .from("posts")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();

    const update: Record<string, unknown> = {
      title,
      slug,
      excerpt,
      cover_url,
      body_md,
      published_at: wantPublished
        ? current?.published_at ?? new Date().toISOString()
        : null,
    };

    await supabase.from("posts").update(update).eq("id", id);

    revalidatePath("/insights");
    revalidatePath(`/insights/${oldSlug}`);
    revalidatePath(`/insights/${slug}`);
    redirect(`/admin/posts/${id}`);
  }

  async function deletePost(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const id = String(formData.get("id"));
    const slug = String(formData.get("slug"));
    await supabase.from("posts").delete().eq("id", id);
    revalidatePath("/insights");
    revalidatePath(`/insights/${slug}`);
    redirect("/admin/posts");
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Edit · {post.title}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            /insights/{post.slug} ·{" "}
            {post.published_at
              ? `published ${new Date(post.published_at).toLocaleDateString()}`
              : "draft"}
          </p>
        </div>
        <a
          href={`/insights/${post.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost text-sm"
        >
          View
        </a>
      </div>

      <form action={savePost} className="space-y-4 border border-black/10 p-6">
        <input type="hidden" name="id" defaultValue={post.id} />
        <input type="hidden" name="oldSlug" defaultValue={post.slug} />

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input
            name="title"
            defaultValue={post.title}
            required
            className="w-full border border-black/20 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Slug</span>
          <input
            name="slug"
            defaultValue={post.slug}
            className="w-full border border-black/20 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Excerpt</span>
          <textarea
            name="excerpt"
            defaultValue={post.excerpt ?? ""}
            rows={2}
            className="w-full border border-black/20 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cover image URL</span>
          <input
            name="cover_url"
            defaultValue={post.cover_url ?? ""}
            className="w-full border border-black/20 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Body (Markdown)</span>
          <textarea
            name="body_md"
            defaultValue={post.body_md ?? ""}
            rows={20}
            spellCheck
            className="w-full border border-black/20 bg-black/5 px-3 py-2 font-mono text-sm"
          />
          <span className="mt-1 block text-xs text-[color:var(--muted)]">
                        Standard Markdown is supported (headings, bold, italic, links, code, lists, blockquotes, and images).
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="published"
            defaultChecked={!!post.published_at}
          />
          <span className="text-sm">Published</span>
        </label>

        <div>
          <button className="btn btn-primary">Save</button>
        </div>
      </form>

      <form action={deletePost} className="border border-red-300 p-6">
        <input type="hidden" name="id" defaultValue={post.id} />
        <input type="hidden" name="slug" defaultValue={post.slug} />
        <h2 className="text-lg font-bold text-red-700">Delete post</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Permanent. Removes this post from /insights.
        </p>
        <button className="btn btn-ghost mt-3 text-sm text-red-700">Delete</button>
      </form>
    </div>
  );
}
