import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { RESERVED_VIDEO_SLUGS } from "@/lib/videos";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export default async function AdminVideosIndex() {
  const { supabase } = await requireAdmin();
  const { data: videos } = await supabase
    .from("videos")
    .select("id,slug,title,provider,format,published_at,updated_at")
    .order("updated_at", { ascending: false });

  async function createVideo(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const provider = String(formData.get("provider") ?? "cloudflare_stream");
    const reference = String(formData.get("reference") ?? "").trim();
    if (!reference) return;

    let slug = slugify(String(formData.get("slug") ?? "") || title);
    if (RESERVED_VIDEO_SLUGS.includes(slug)) slug = `${slug}-clip`;

    const { data, error } = await supabase
      .from("videos")
      .insert({
        title,
        slug,
        provider,
        playback_id: provider === "file" ? null : reference,
        source_url: provider === "file" ? reference : null
      })
      .select("id")
      .single();
    if (error || !data) return;
    redirect(`/admin/videos/${data.id}`);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Videos</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Each clip gets its own page at /videos/&lt;slug&gt; and appears in the scroll feed.
        A clip is only worth publishing once it has a transcript — that is the part search
        engines and AI answer engines can actually read.
      </p>

      <form action={createVideo} className="mt-8 space-y-3 border border-black/10 p-6">
        <h2 className="text-lg font-bold">New clip</h2>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input name="title" required className="w-full border border-black/20 px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Slug (optional)</span>
          <input
            name="slug"
            placeholder="auto-generated from title"
            className="w-full border border-black/20 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Source</span>
          <select name="provider" defaultValue="cloudflare_stream" className="w-full border border-black/20 px-3 py-2">
            <option value="cloudflare_stream">Cloudflare Stream (autoplays in the feed)</option>
            <option value="file">Direct file URL — .mp4 or .m3u8 (autoplays in the feed)</option>
            <option value="youtube">YouTube (tap to play; Google credits youtube.com)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Reference</span>
          <input
            name="reference"
            required
            placeholder="Stream video UID, YouTube video ID, or a direct file URL"
            className="w-full border border-black/20 px-3 py-2"
          />
        </label>

        <button className="btn btn-primary">Create draft</button>
      </form>

      <ul className="mt-8 divide-y divide-black/10 border-t border-b border-black/10">
        {(videos ?? []).map((v: any) => (
          <li key={v.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-bold">{v.title}</p>
              <p className="text-sm text-[color:var(--muted)]">
                /videos/{v.slug} · {v.format} · {v.provider} ·{" "}
                {v.published_at
                  ? `published ${new Date(v.published_at).toLocaleDateString()}`
                  : "draft"}
              </p>
            </div>
            <Link href={`/admin/videos/${v.id}`} className="btn btn-ghost text-sm">
              Edit
            </Link>
          </li>
        ))}
        {(!videos || videos.length === 0) && (
          <li className="py-8 text-center text-sm text-[color:var(--muted)]">
            No clips yet. Create one above.
          </li>
        )}
      </ul>
    </div>
  );
}
