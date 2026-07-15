import { createSupabaseServer } from "./supabase/server";

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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = await createSupabaseServer();
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("posts")
      .select("slug,title,excerpt,cover_url,published_at,track,pinned")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPost(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = await createSupabaseServer();
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
