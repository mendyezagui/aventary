import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { clearQuestions, deleteQuestion } from "./actions";
import { ConfirmButton } from "./ConfirmButton";

// Answers were not kept until this point — 0008 stored the question alone, and
// 0012 added the answer column. Rows older than this can never have one, and
// saying "no answer recorded" about them reads as a bug in the widget rather
// than a feature that did not exist yet. Roughly the deploy that started
// recording them; a few minutes either way only changes a label.
const ANSWERS_KEPT_FROM = new Date("2026-09-15T00:05:00Z");

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

  // Only rows that COULD have had an answer count as missing one.
  const unanswered = rows.filter(
    (r) => !r.answer && new Date(r.created_at) >= ANSWERS_KEPT_FROM
  ).length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Questions</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Every question asked on a client page, with the answer given. Newest first, last 200.
        {unanswered > 0 && (
          <>
            {" "}
            <strong>{unanswered}</strong> never got an answer recorded.
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
                <th className="p-3"></th>
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
                      {r.answer ?? (
                        <span className="opacity-60">
                          {new Date(r.created_at) < ANSWERS_KEPT_FROM
                            ? "— asked before answers were kept —"
                            : "— no answer recorded —"}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <form action={deleteQuestion}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="link-underline text-xs opacity-70 hover:opacity-100">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <form action={clearQuestions} className="mt-8">
          <ConfirmButton
            className="border border-black/20 px-4 py-2 text-sm hover:bg-black hover:text-white"
            confirmText={`Delete all ${rows.length} questions? This cannot be undone.`}
          >
            Clear all questions
          </ConfirmButton>
          <span className="ml-3 text-xs text-[color:var(--muted)]">
            Permanent — there is no archive behind this table.
          </span>
        </form>
      )}
    </div>
  );
}
