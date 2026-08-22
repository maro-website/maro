import { NextResponse } from "next/server";
import { getSupabaseAdmin, resolveAssetForClient, supabaseServerConfigured } from "@/lib/supabase/server";
import { sanitizePresetConfig, type PresetTool } from "@/lib/presets/model";
import type { PromptDetail } from "@/lib/prompts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("maro_prompts")
    .select("id, code, tool, target_tool, title, slug, description, category, featured_url, keywords, featured, sort_order, access_level, use_count, created_at, config")
    .eq("id", id).eq("active", true).eq("status", "published").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const tool = data.tool as PresetTool;
  const item: PromptDetail = {
    ...(data as unknown as PromptDetail), config: sanitizePresetConfig(tool, data.config),
    featured_url: data.featured_url ? await resolveAssetForClient(data.featured_url as string) : null,
  };
  return NextResponse.json({ item });
}
