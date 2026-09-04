"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin nav, hidden on the sign-in page — every link behind it requires a
 * session, and offering "Sign out" to someone who isn't signed in yet is just
 * confusing.
 */
export default function AdminNav() {
  const pathname = usePathname();
  if (pathname === "/admin/login") return null;

  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <Link href="/admin/pages" className="link-underline">Pages</Link>
      <Link href="/admin/videos" className="link-underline">Videos</Link>
      <Link href="/admin/submissions" className="link-underline">Submissions</Link>
      <Link href="/" className="link-underline">View site</Link>
      <form action="/admin/signout" method="post">
        <button className="link-underline">Sign out</button>
      </form>
    </nav>
  );
}
