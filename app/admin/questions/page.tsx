import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  email: string | null;
  question: string;
  answer: string | null;
  created_at: string;
  answered_at: string | null;
  notified_at: string | null;
};

/**
 * Every question a client has asked on a proposal page, with the answer they
 * were given.
 *
 * Read with the SERVICE-ROLE client, not the signed-in admin's session.
 * client_page_questions is RLS-enabled with no policies — the deliberate design
 * of the whole client_page_* family — so the anon-key client this page's
 * requireAdmin() hands back would return an empty table and look like "no
 * questions yet". The gate is requireAdmin above; the read is server-side.
 */
export default async function QuestionsPage() {
  await requireAdmin();
  const db = createSupabaseAdmin();

  const { data } = await db
    .from("client_page_questions")
    .select("id,slug,email,question,answer,created_at,answered_at,notified_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  // Titles come from client_pages so the table names the project rather than
  // its slug. One extra query beats an embed here: the two tables are joined by
  // slug rather than by an id, and a question can outlive the page's row.
  const slugs = Array.from(new Set(rows.map((r) => r.slug)));
  const { data: pages } = slugs.length
    ? await db.from("client_pages").select("slug,title,client_name").in("slug", slugs)
    : { data: [] };
  const titles = new Map(
    (pages ?? []).map((p) => [
      p.slug as string,
      {
        title: (p.title as string) ?? (p.slug as string),
        client: (p.client_name as string | null) ?? null
      }
    ])
  );

  const unanswered = rows.filter((r) => !r.answer).length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Questions</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Every question asked on a client page, with the answer given. Newest first, last 200.
        {unanswered > 0 && (
          <>
            {" "}
            <strong>{unanswered}</strong> never got an answer — the stream failed partway.
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        These are the client telling you what they actually care about, before any meeting.
        Each one is emailed to you as it happens.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 border border-black/10 p-6 text-sm">
          Nothing asked yet. Questions appear here the moment a reader uses the Ask panel on a
          client page.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border border-black/10 text-sm">
            <thead className="bg-black/5 text-left">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Project</th>
                <th className="p-3">Asked by</th>
                <th className="p-3">Question</th>
                <th className="p-3">Answer given</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const page = titles.get(r.slug);
                return (
                  <tr key={r.id} className="border-t border-black/10 align-top">
                    <td className="whitespace-nowrap p-3">
                      {new Date(r.created_at).toLocaleString()}
                      {!r.notified_at && (
                        <span className="mt-1 block text-xs opacity-60">not emailed</span>
                      )}
                    </td>
                    <td className="p-3">
                      <a className="link-underline" href={`/c/${r.slug}`}>
                        {page?.title ?? r.slug}
                      </a>
                      {page?.client && <span className="block text-xs opacity-60">{page.client}</span>}
                    </td>
                    <td className="p-3">
                      {r.email ? (
                        <a className="link-underline" href={`mailto:${r.email}`}>
                          {r.email}
                        </a>
                      ) : (
                        <span className="opacity-60">shared password</span>
                      )}
                    </td>
                    <td className="max-w-sm whitespace-pre-wrap p-3">{r.question}</td>
                    <td className="max-w-xl whitespace-pre-wrap p-3">
                      {r.answer ?? <span className="opacity-60">— no answer recorded —</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
