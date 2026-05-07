import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPagesIndex() {
  const { supabase } = await requireAdmin();
  const { data: pages } = await supabase
    .from("pages")
    .select("slug,title,published,updated_at")
    .order("slug");

  return (
    <div>
      <h1 className="text-3xl font-bold">Pages</h1>
      <ul className="mt-8 divide-y divide-black/10 border-t border-b border-black/10">
        {(pages ?? []).map((p: any) => (
          <li key={p.slug} className="flex items-center justify-between py-4">
            <div>
              <p className="font-bold">{p.title}</p>
              <p className="text-sm text-[color:var(--muted)]">/{p.slug === "home" ? "" : p.slug}</p>
            </div>
            <Link href={`/admin/pages/${p.slug}`} className="btn btn-ghost text-sm">Edit</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
