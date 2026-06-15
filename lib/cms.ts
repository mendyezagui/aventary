import { createSupabasePublic } from "./supabase/server";

// True only when Supabase is fully configured. Public reads use the anon key;
// if it's absent, callers fall back to seed content instead of erroring.
const supabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type Block = {
  id: string;
  type: string;
  position: number;
  data: Record<string, any>;
};

export type Page = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  body_html?: string | null;
  blocks: Block[];
};

export async function getPage(slug: string): Promise<Page | null> {
  if (!supabaseConfigured()) return null;
  try {
    const supabase = createSupabasePublic();
    const { data: page } = await supabase
      .from("pages")
      .select("id,slug,title,description,body_html")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (!page) return null;
    const { data: blocks } = await supabase
      .from("blocks")
      .select("id,type,position,data")
      .eq("page_id", page.id)
      .order("position", { ascending: true });
    return { ...page, blocks: (blocks ?? []) as Block[] };
  } catch {
    return null;
  }
}

export async function listPosts() {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createSupabasePublic();
    const { data } = await supabase
      .from("posts")
      .select("slug,title,excerpt,cover_url,published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPost(slug: string) {
  if (!supabaseConfigured()) return null;
  try {
    const supabase = createSupabasePublic();
    const { data } = await supabase
      .from("posts")
      .select("slug,title,excerpt,body_md,body_html,cover_url,published_at")
      .eq("slug", slug)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}
