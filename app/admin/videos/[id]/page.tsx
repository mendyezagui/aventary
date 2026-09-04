import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  RESERVED_VIDEO_SLUGS,
  formatChapters,
  indexingGaps,
  parseChapters,
  resolveVideoSource,
  type Video,
  type VideoChapter
} from "@/lib/videos";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function intOrNull(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export default async function AdminEditVideo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: video } = await supabase
    .from("videos")
    // One literal string: supabase-js derives the row type from it.
    .select(
      "id,slug,title,description,transcript,provider,playback_id,source_url,thumbnail_url,duration_seconds,orientation,format,topics,post_slug,pinned,position,published_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!video) notFound();

  const [{ data: chapterRows }, { data: posts }] = await Promise.all([
    supabase
      .from("video_chapters")
      .select("title,start_seconds,end_seconds")
      .eq("video_id", id)
      .order("position", { ascending: true }),
    supabase.from("posts").select("slug,title").order("published_at", { ascending: false })
  ]);

  const chapterText = formatChapters((chapterRows ?? []) as VideoChapter[]);

  async function saveVideo(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const id = String(formData.get("id"));
    const oldSlug = String(formData.get("oldSlug"));
    const oldPostSlug = String(formData.get("oldPostSlug") ?? "");

    const title = String(formData.get("title") ?? "").trim();
    const slugRaw = String(formData.get("slug") ?? "").trim();
    let slug = slugify(slugRaw || title);
    if (RESERVED_VIDEO_SLUGS.includes(slug)) slug = `${slug}-clip`;

    const selected = String(formData.get("provider") ?? "cloudflare_stream");
    const playbackRaw = String(formData.get("playback_id") ?? "").trim();
    const sourceRaw = String(formData.get("source_url") ?? "").trim();
    // Read whichever field the selected source owns, then let a pasted link
    // override the selection — same rule as the create form.
    const source = resolveVideoSource(
      selected,
      selected === "file" ? sourceRaw || playbackRaw : playbackRaw || sourceRaw
    );
    const duration = intOrNull(formData.get("duration_seconds"));
    const postSlug = String(formData.get("post_slug") ?? "").trim() || null;

    const update = {
      title,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      transcript: String(formData.get("transcript") ?? "").trim() || null,
      // The DB's videos_playable check enforces this pairing; resolveVideoSource
      // clears the unused column so a source switch can't leave a stale
      // reference behind.
      ...source,
      thumbnail_url: String(formData.get("thumbnail_url") ?? "").trim() || null,
      duration_seconds: duration,
      orientation: String(formData.get("orientation") ?? "vertical"),
      format: String(formData.get("format") ?? "short"),
      topics: String(formData.get("topics") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      post_slug: postSlug,
      pinned: formData.get("pinned") === "on",
      position: Number(String(formData.get("position") ?? "0")) || 0,
      published_at:
        formData.get("published") === "on"
          ? String(formData.get("publishedAt") || "") || new Date().toISOString()
          : null
    };

    const { error } = await supabase.from("videos").update(update).eq("id", id);
    if (error) redirect(`/admin/videos/${id}?error=${encodeURIComponent(error.message)}`);

    // Chapters are fully re-derived from the textarea on every save, so the
    // stored rows can never drift from what the editor is looking at.
    const chapters = parseChapters(String(formData.get("chapters") ?? ""), duration);
    await supabase.from("video_chapters").delete().eq("video_id", id);
    if (chapters.length) {
      await supabase.from("video_chapters").insert(
        chapters.map((c, i) => ({
          video_id: id,
          title: c.title,
          start_seconds: c.start_seconds,
          end_seconds: c.end_seconds,
          position: i
        }))
      );
    }

    revalidatePath("/videos");
    revalidatePath("/videos/feed");
    revalidatePath(`/videos/${oldSlug}`);
    revalidatePath(`/videos/${slug}`);
    revalidatePath("/insights");
    if (oldPostSlug) revalidatePath(`/insights/${oldPostSlug}`);
    if (postSlug) revalidatePath(`/insights/${postSlug}`);
    redirect(`/admin/videos/${id}`);
  }

  async function deleteVideo(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const id = String(formData.get("id"));
    const slug = String(formData.get("slug"));
    await supabase.from("videos").delete().eq("id", id);
    revalidatePath("/videos");
    revalidatePath("/videos/feed");
    revalidatePath(`/videos/${slug}`);
    redirect("/admin/videos");
  }

  const gaps = indexingGaps(video as unknown as Video);

  const field = "w-full border border-black/20 px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Edit · {video.title}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            /videos/{video.slug} ·{" "}
            {video.published_at
              ? `published ${new Date(video.published_at).toLocaleDateString()}`
              : "draft"}
          </p>
        </div>
        <a
          href={`/videos/${video.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost text-sm"
        >
          View
        </a>
      </div>

      {gaps.length ? (
        <div className="border border-amber-400 bg-amber-50 p-6">
          <h2 className="text-sm font-bold">
            {video.published_at ? "Published, but not fully indexable" : "Before publishing"}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form action={saveVideo} className="space-y-4 border border-black/10 p-6">
        <input type="hidden" name="id" defaultValue={video.id} />
        <input type="hidden" name="oldSlug" defaultValue={video.slug} />
        <input type="hidden" name="oldPostSlug" defaultValue={video.post_slug ?? ""} />
        <input type="hidden" name="publishedAt" defaultValue={video.published_at ?? ""} />

        <label className="block">
          <span className={label}>Title</span>
          <input name="title" defaultValue={video.title} required className={field} />
        </label>

        <label className="block">
          <span className={label}>Slug</span>
          <input name="slug" defaultValue={video.slug} className={field} />
        </label>

        <label className="block">
          <span className={label}>Description</span>
          <textarea name="description" defaultValue={video.description ?? ""} rows={3} className={field} />
          <span className="mt-1 block text-xs text-[color:var(--muted)]">
            Used as the page description, the OG description, and the video sitemap entry.
          </span>
        </label>

        <label className="block">
          <span className={label}>Transcript</span>
          <textarea
            name="transcript"
            defaultValue={video.transcript ?? ""}
            rows={12}
            className={`${field} font-mono text-xs`}
          />
          <span className="mt-1 block text-xs text-[color:var(--muted)]">
            Blank lines separate paragraphs. Cloudflare Stream can auto-generate captions —
            paste them here and clean them up. This is the single highest-value field on the form.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Source</span>
            <select name="provider" defaultValue={video.provider} className={field}>
              <option value="cloudflare_stream">Cloudflare Stream</option>
              <option value="file">Direct file URL</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>

          <label className="block">
            <span className={label}>Stream UID / YouTube ID</span>
            <input name="playback_id" defaultValue={video.playback_id ?? ""} className={field} />
            <span className="mt-1 block text-xs text-[color:var(--muted)]">
              A pasted link wins over the Source dropdown — drop a YouTube URL or a
              direct file URL in either field and the source is corrected on save.
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Direct file URL (source = direct file only)</span>
            <input name="source_url" defaultValue={video.source_url ?? ""} className={field} />
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Thumbnail URL (optional override)</span>
            <input name="thumbnail_url" defaultValue={video.thumbnail_url ?? ""} className={field} />
          </label>

          <label className="block">
            <span className={label}>Duration (seconds)</span>
            <input
              name="duration_seconds"
              type="number"
              min={1}
              defaultValue={video.duration_seconds ?? ""}
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Orientation</span>
            <select name="orientation" defaultValue={video.orientation} className={field}>
              <option value="vertical">Vertical (9:16)</option>
              <option value="horizontal">Horizontal (16:9)</option>
            </select>
          </label>

          <label className="block">
            <span className={label}>Format</span>
            <select name="format" defaultValue={video.format} className={field}>
              <option value="short">Short</option>
              <option value="long">Long form</option>
            </select>
          </label>

          <label className="block">
            <span className={label}>Feed position</span>
            <input name="position" type="number" defaultValue={video.position ?? 0} className={field} />
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Topics (comma separated)</span>
            <input name="topics" defaultValue={(video.topics ?? []).join(", ")} className={field} />
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Related Insights post</span>
            <select name="post_slug" defaultValue={video.post_slug ?? ""} className={field}>
              <option value="">— none —</option>
              {(posts ?? []).map((p: any) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[color:var(--muted)]">
              Linking a clip to an article cross-links them in both directions, which is what
              makes search engines read them as one topic rather than two.
            </span>
          </label>
        </div>

        <label className="block">
          <span className={label}>Chapters</span>
          <textarea
            name="chapters"
            defaultValue={chapterText}
            rows={6}
            placeholder={"0:00 Where leads enter\n2:00 The three stall points\n6:40 Ranking the fixes"}
            className={`${field} font-mono text-xs`}
          />
          <span className="mt-1 block text-xs text-[color:var(--muted)]">
            One per line, &quot;0:00 Title&quot;. Each runs until the next starts. These become the
            Key moments jump-links in Google. Worth it on long form, skip on shorts.
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="pinned" defaultChecked={video.pinned} />
          <span className="text-sm font-medium">Pinned (leads the feed)</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={!!video.published_at} />
          <span className="text-sm font-medium">Published</span>
        </label>

        <button className="btn btn-primary">Save</button>
      </form>

      <form action={deleteVideo} className="border border-black/10 p-6">
        <input type="hidden" name="id" defaultValue={video.id} />
        <input type="hidden" name="slug" defaultValue={video.slug} />
        <button className="btn btn-ghost text-sm text-red-700">Delete clip</button>
      </form>
    </div>
  );
}
