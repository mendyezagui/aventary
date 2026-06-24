import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { approveAndSend, reject } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  drafted: "bg-amber-100 text-amber-900",
  approved: "bg-blue-100 text-blue-900",
  sent: "bg-green-100 text-green-900",
  rejected: "bg-black/10 text-black/60",
  failed: "bg-red-100 text-red-900",
};

export default async function LoopsPage() {
  await requireAdmin();
  // Service-role read: loop_runs is RLS-locked to the service role; the page is
  // already gated by requireAdmin().
  const sb = createSupabaseAdmin();

  const { data: loops } = await sb
    .from("loops")
    .select("id, name, slug, description, enabled, config")
    .order("created_at");

  const { data: runs } = await sb
    .from("loop_runs")
    .select(
      "id, loop_id, run_date, status, title, linkedin_post, newsletter_subject, newsletter_body, model, error, created_at, decided_by, sent_to",
    )
    .order("created_at", { ascending: false })
    .limit(60);

  const loopName = new Map((loops ?? []).map((l: any) => [l.id, l.name]));

  return (
    <div>
      <h1 className="text-3xl font-bold">Loops</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Scheduled AI jobs. Each run drafts content for review — nothing is sent until you approve it.
      </p>

      {/* Loop definitions */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {(loops ?? []).map((l: any) => (
          <div key={l.id} className="border border-black/20 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{l.name}</h2>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  l.enabled ? "bg-green-100 text-green-900" : "bg-black/10 text-black/60"
                }`}
              >
                {l.enabled ? "enabled" : "paused"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{l.description}</p>
            <p className="mt-2 font-mono text-xs text-black/50">{l.slug}</p>
          </div>
        ))}
        {(loops ?? []).length === 0 && (
          <p className="text-sm text-[color:var(--muted)]">No loops defined yet.</p>
        )}
      </div>

      {/* Runs */}
      <h2 className="mt-12 text-xl font-bold">Recent runs</h2>
      <div className="mt-4 space-y-4">
        {(runs ?? []).map((r: any) => (
          <div key={r.id} className="border border-black/15 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? ""}`}>
                {r.status}
              </span>
              <span className="text-sm font-semibold">{loopName.get(r.loop_id) ?? r.loop_id}</span>
              <span className="text-xs text-black/50">{r.run_date}</span>
              {r.model && <span className="font-mono text-xs text-black/40">{r.model}</span>}
              {r.decided_by && (
                <span className="text-xs text-black/50">
                  {r.status} by {r.decided_by}
                  {r.sent_to ? ` → ${r.sent_to}` : ""}
                </span>
              )}
            </div>

            {r.error && (
              <p className="mt-3 rounded bg-red-50 p-3 font-mono text-xs text-red-900">{r.error}</p>
            )}

            {(r.linkedin_post || r.newsletter_body) && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-black/50">LinkedIn post</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{r.linkedin_post ?? "—"}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-black/50">Newsletter</h3>
                  {r.newsletter_subject && (
                    <p className="mt-1 text-sm font-semibold">{r.newsletter_subject}</p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm">{r.newsletter_body ?? "—"}</p>
                </div>
              </div>
            )}

            {r.status === "drafted" && (
              <div className="mt-4 flex gap-3">
                <form action={approveAndSend}>
                  <input type="hidden" name="runId" value={r.id} />
                  <button className="bg-black px-4 py-2 text-sm text-white hover:bg-black/80">
                    Approve &amp; send
                  </button>
                </form>
                <form action={reject}>
                  <input type="hidden" name="runId" value={r.id} />
                  <button className="border border-black/30 px-4 py-2 text-sm hover:bg-black/5">
                    Reject
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
        {(runs ?? []).length === 0 && (
          <p className="text-sm text-[color:var(--muted)]">
            No runs yet. The loop runs daily; you can also trigger it manually (see the deploy notes).
          </p>
        )}
      </div>
    </div>
  );
}
