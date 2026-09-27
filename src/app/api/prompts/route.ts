import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured, resolveAssetForClient } from "@/lib/supabase/server";
import { isPresetTool, type PresetTool } from "@/lib/presets/model";
import type { PresetCategoryItem, PromptItem } from "@/lib/prompts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BROWSE_FIELDS = "id, code, tool, target_tool, title, slug, description, category, featured_url, keywords, featured, sort_order, access_level, use_count, created_at";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

function cleanSearch(value: string | null): string {
  return (value ?? "").trim().slice(0, 120).replace(/[%,_]/g, " ").replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ items: [], liked: [], categories: [], hasMore: false });

  const url = new URL(req.url);
  const requestedTool = url.searchParams.get("tool");
  const tool: PresetTool = isPresetTool(requestedTool) ? requestedTool : "imazh";
  const category = (url.searchParams.get("category") ?? "").trim().slice(0, 100);
  const search = cleanSearch(url.searchParams.get("q"));
  const page = Math.max(0, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
  const limit = Math.min(60, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "36", 10) || 36));
  const admin = getSupabaseAdmin();

  try {
    let query = admin.from("maro_prompts").select(BROWSE_FIELDS)
      .eq("tool", tool).eq("active", true).eq("status", "published")
      .order("featured", { ascending: false }).order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("search_text", `%${search}%`);

    const from = page * limit;
    const { data, error } = await query.range(from, from + limit);
    if (error) throw error;
    const raw = data ?? [];
    const hasMore = raw.length > limit;
    const items = await Promise.all(raw.slice(0, limit).map(async (row) => ({
      ...(row as unknown as PromptItem),
      featured_url: row.featured_url ? await resolveAssetForClient(row.featured_url as string) : null,
    })));

    const { data: categoryRows } = await admin.from("preset_categories")
      .select("id, tool, slug, label, description, sort_order, active")
      .eq("tool", tool).eq("active", true).order("sort_order").order("label");
    const categories: PresetCategoryItem[] = (categoryRows ?? []).map((row) => ({
      id: row.id as string, tool: row.tool as PresetTool, slug: row.slug as string,
      label: row.label as string, description: (row.description as string) ?? "",
      sortOrder: (row.sort_order as number) ?? 0, active: Boolean(row.active),
    }));

    let liked: string[] = [];
    const user = await getUserFromToken(bearer(req));
    if (user && items.length) {
      const { data: likes } = await admin.from("prompt_likes").select("prompt_id")
        .eq("user_id", user.id).in("prompt_id", items.map((item) => item.id));
      liked = (likes ?? []).map((row) => row.prompt_id as string);
    }
    return NextResponse.json({ items, liked, categories, hasMore, page });
  } catch {
    return NextResponse.json({ items: [], liked: [], categories: [], hasMore: false });
  }
}
