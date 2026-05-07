import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase/server";

function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Redirects to /admin/login unless the current user's email is in ADMIN_EMAILS. */
export async function requireAdmin() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const email = user?.email?.toLowerCase();
  const allowed = allowlist();
  if (!email || (allowed.length > 0 && !allowed.includes(email))) {
    redirect("/admin/login");
  }
  return { supabase: sb, email: email! };
}
