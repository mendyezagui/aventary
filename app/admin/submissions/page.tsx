import { requireAdmin } from "@/lib/admin";

export default async function SubmissionsPage() {
  const { supabase } = await requireAdmin();
  const { data: rows } = await supabase
    .from("contact_submissions")
    .select("id,name,email,company,phone,message,source,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-3xl font-bold">Submissions</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Last 200 contact-form entries.</p>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full border border-black/10 text-sm">
          <thead className="bg-black/5 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Company</th>
              <th className="p-3">Source</th>
              <th className="p-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-black/10 align-top">
                <td className="whitespace-nowrap p-3">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">
                  <a className="link-underline" href={`mailto:${r.email}`}>{r.email}</a>
                </td>
                <td className="p-3">{r.company ?? "—"}</td>
                <td className="p-3">{r.source ?? "—"}</td>
                <td className="p-3 max-w-xl whitespace-pre-wrap">{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
