import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PROMPT_CATEGORIES } from "@/lib/prompts/types";
import type { PresetTool } from "@/lib/presets/model";

export interface PresetCategoryRow {
  id: string;
  tool: PresetTool;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export async function listPresetCategories(includeInactive = true, tool?: PresetTool): Promise<PresetCategoryRow[]> {
  let q = getSupabaseAdmin().from("preset_categories").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("active", true);
  if (tool) q = q.eq("tool", tool);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    tool: (r.tool as PresetTool) ?? "imazh",
    slug: r.slug as string,
    label: r.label as string,
    description: (r.description as string) ?? "",
    sortOrder: (r.sort_order as number) ?? 0,
    active: r.active as boolean,
  }));
}

export async function upsertPresetCategory(input: {
  id?: string;
  tool: PresetTool;
  slug: string;
  label: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}) {
  const row = {
    tool: input.tool,
    slug: input.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    label: input.label.trim(),
    description: input.description?.trim() ?? "",
    sort_order: input.sortOrder ?? 0,
    active: input.active ?? true,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data, error } = await getSupabaseAdmin()
      .from("preset_categories")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await getSupabaseAdmin().from("preset_categories").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

/** Backfill preset_categories from legacy fixed list when table is empty. */
export async function ensurePresetCategoriesSeeded(tool: PresetTool = "imazh"): Promise<number> {
  const existing = await listPresetCategories(true, tool);
  if (existing.length > 0) return 0;

  if (tool !== "imazh") return 0;

  let created = 0;
  for (let i = 0; i < PROMPT_CATEGORIES.length; i += 1) {
    const label = PROMPT_CATEGORIES[i];
    await upsertPresetCategory({
      tool,
      slug: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      sortOrder: i,
      active: true,
    });
    created += 1;
  }
  return created;
}
