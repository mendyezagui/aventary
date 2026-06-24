import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminHome() {
  const { email } = await requireAdmin();
  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {email}</h1>
      <p className="mt-2 text-[color:var(--muted)]">Manage your site content.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link href="/admin/pages" className="block border border-black/20 p-6 hover:bg-black hover:text-white">
          <h2 className="text-xl font-bold">Pages</h2>
          <p className="mt-2 text-sm opacity-80">Edit homepage, about, contact, appointments.</p>
        </Link>
        <Link href="/admin/posts" className="block border border-black/20 p-6 hover:bg-black hover:text-white">
          <h2 className="text-xl font-bold">Insights</h2>
          <p className="mt-2 text-sm opacity-80">Write and publish blog posts.</p>
        </Link>
        <Link href="/admin/submissions" className="block border border-black/20 p-6 hover:bg-black hover:text-white">
          <h2 className="text-xl font-bold">Submissions</h2>
          <p className="mt-2 text-sm opacity-80">Inbound leads from the contact form.</p>
        </Link>
        <Link href="/admin/loops" className="block border border-black/20 p-6 hover:bg-black hover:text-white">
          <h2 className="text-xl font-bold">Loops</h2>
          <p className="mt-2 text-sm opacity-80">Scheduled AI jobs — review &amp; approve drafts before they send.</p>
        </Link>
      </div>
    </div>
  );
}
