import Link from "next/link";
import "./../globals.css";

export const metadata = { title: "Admin — Aventary", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/10">
        <div className="container-site flex items-center justify-between py-4">
          <Link href="/admin" className="font-heading font-bold">Aventary · Admin</Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin/pages" className="link-underline">Pages</Link>
            <Link href="/admin/submissions" className="link-underline">Submissions</Link>
            <Link href="/" className="link-underline">View site</Link>
            <form action="/admin/signout" method="post"><button className="link-underline">Sign out</button></form>
          </nav>
        </div>
      </header>
      <main className="container-site py-8">{children}</main>
    </div>
  );
}
