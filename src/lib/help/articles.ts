import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface HelpArticleRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: string;
  published: boolean;
  archived: boolean;
  sortOrder: number;
  updatedAt: string;
}

export async function listHelpArticles(includeArchived = true): Promise<HelpArticleRow[]> {
  let q = getSupabaseAdmin().from("help_articles").select("*").order("sort_order").order("updated_at", { ascending: false });
  if (!includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  return (data ?? []).map(mapRow);
}

export async function upsertHelpArticle(input: {
  id?: string;
  slug: string;
  title: string;
  body?: string;
  category?: string;
  published?: boolean;
  archived?: boolean;
  sortOrder?: number;
}) {
  const row = {
    slug: input.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    title: input.title.trim(),
    body: input.body?.trim() ?? "",
    category: input.category?.trim() || "general",
    published: input.published ?? false,
    archived: input.archived ?? false,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data, error } = await getSupabaseAdmin()
      .from("help_articles")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await getSupabaseAdmin().from("help_articles").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

function mapRow(r: Record<string, unknown>): HelpArticleRow {
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    body: (r.body as string) ?? "",
    category: (r.category as string) ?? "general",
    published: Boolean(r.published),
    archived: Boolean(r.archived),
    sortOrder: (r.sort_order as number) ?? 0,
    updatedAt: r.updated_at as string,
  };
}

export async function getPublishedHelpArticles() {
  const { data } = await getSupabaseAdmin()
    .from("help_articles")
    .select("slug, title, body, category, sort_order")
    .eq("published", true)
    .eq("archived", false)
    .order("sort_order");
  return data ?? [];
}
