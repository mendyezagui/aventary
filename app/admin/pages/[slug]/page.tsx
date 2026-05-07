import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export default async function AdminEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireAdmin();
  const { data: page } = await supabase
    .from("pages").select("id,slug,title,description,published").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const { data: blocks } = await supabase
    .from("blocks").select("id,type,position,data").eq("page_id", page.id).order("position");

  async function savePage(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const slug = String(formData.get("slug"));
    await supabase.from("pages").update({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      published: formData.get("published") === "on"
    }).eq("id", String(formData.get("id")));
    revalidatePath(`/${slug === "home" ? "" : slug}`);
    redirect(`/admin/pages/${slug}`);
  }

  async function saveBlock(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const slug = String(formData.get("slug"));
    const id = String(formData.get("id"));
    const raw = String(formData.get("data") ?? "{}");
    let data: unknown;
    try { data = JSON.parse(raw); } catch { data = {}; }
    await supabase.from("blocks").update({ data }).eq("id", id);
    revalidatePath(`/${slug === "home" ? "" : slug}`);
    redirect(`/admin/pages/${slug}`);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Edit · {page.title}</h1>
        <p className="text-sm text-[color:var(--muted)]">/{page.slug === "home" ? "" : page.slug}</p>
      </div>

      <form action={savePage} className="space-y-4 border border-black/10 p-6">
        <input type="hidden" name="id" defaultValue={page.id} />
        <input type="hidden" name="slug" defaultValue={page.slug} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input name="title" defaultValue={page.title}
                 className="w-full border border-black/20 px-3 py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Description</span>
          <textarea name="description" defaultValue={page.description ?? ""}
                    rows={2} className="w-full border border-black/20 px-3 py-2" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={page.published} />
          <span className="text-sm">Published</span>
        </label>
        <button className="btn btn-primary">Save page</button>
      </form>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Blocks</h2>
        {(blocks ?? []).map((b: any) => (
          <form key={b.id} action={saveBlock} className="space-y-3 border border-black/10 p-6">
            <input type="hidden" name="id" defaultValue={b.id} />
            <input type="hidden" name="slug" defaultValue={page.slug} />
            <p className="text-sm">
              <span className="font-bold">{b.type}</span>{" "}
              <span className="text-[color:var(--muted)]">(position {b.position})</span>
            </p>
            <textarea
              name="data"
              defaultValue={JSON.stringify(b.data, null, 2)}
              rows={10}
              spellCheck={false}
              className="w-full border border-black/20 bg-black/5 px-3 py-2 font-mono text-sm"
            />
            <button className="btn btn-primary text-sm">Save block</button>
          </form>
        ))}
      </div>
    </div>
  );
}
