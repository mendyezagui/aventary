"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdmin } from "@/lib/supabase/server";

// Deleting is permanent: these rows are the only record of what a client asked
// and what they were told, and there is no archive behind them. That is the
// right trade for a table whose first fourteen rows include "d", "kjl" and the
// error message the widget printed when it broke — but it is worth knowing.
//
// Both actions call requireAdmin FIRST. A server action is a public endpoint
// with a generated URL, not a private function: without that line anyone who
// found the id could clear the table.

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { error } = await createSupabaseAdmin()
    .from("client_page_questions")
    .delete()
    .eq("id", id);
  if (error) console.error("question delete failed", error);

  revalidatePath("/admin/questions");
}

export async function clearQuestions() {
  await requireAdmin();

  // PostgREST refuses an unfiltered delete, on purpose. A filter that matches
  // everything is the explicit way to say you meant it.
  const { error } = await createSupabaseAdmin()
    .from("client_page_questions")
    .delete()
    .gte("created_at", "1970-01-01");
  if (error) console.error("question clear failed", error);

  revalidatePath("/admin/questions");
}
