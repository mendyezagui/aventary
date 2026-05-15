import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function AdminPostsIndex() {
  const { supabase } = await requireAdmin();
  const { data: posts } = await supabase
    .from("posts")
    .select("id,slug,title,published_at,updated_at")
    .order("updated_at", { ascending: false });

  async function createPost(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const slug = slugify(String(formData.get("slug") ?? "") || title);
    const { data, error } = await supabase
      .from("posts")
      .insert({ title, slug, body_md: "" })
      .select("id")
      .single();
    if (error || !data) return;
    redirect(`/admin/posts/${data.id}`);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Insights posts</h1>

      <form action={createPost} className="mt-8 space-y-3 border border-black/10 p-6">
        <h2 className="text-lg font-bold">New post</h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input name="title" required className="w-full border border-black/20 px-3 py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Slug (optional)</span>
          <input name="slug" placeholder="auto-generated from title" className="w-full border border-black/20 px-3 py-2" />
        </label>
        <button className="btn btn-primary">Create draft</button>
      </form>

      <ul className="mt-8 divide-y divide-black/10 border-t border-b border-black/10">
        {(posts ?? []).map((p: any) => (
          <li key={p.id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-bold">{p.title}</p>
              <p className="text-sm text-[color:var(--muted)]">
                /insights/{p.slug} · {p.published_at ? `published ${new Date(p.published_at).toLocaleDateString()}` : "draft"}
              </p>
            </div>
            <Link href={`/admin/posts/${p.id}`} className="btn btn-ghost text-sm">Edit</Link>
          </li>
        ))}
        {(!posts || posts.length === 0) && (
          <li className="py-8 text-center text-sm text-[color:var(--muted)]">
            No posts yet. Create one above.
          </li>
        )}
      </ul>
    </div>
  );
}
