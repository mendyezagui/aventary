import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import "./../globals.css";

export const metadata = { title: "Admin — Aventary", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/10">
        <div className="container-site flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/admin" className="font-heading font-bold">Aventary · Admin</Link>
          <AdminNav />
        </div>
      </header>
      <main className="container-site py-8">{children}</main>
    </div>
  );
}
