import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface PresetCategoryRow {
  id: string;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export async function listPresetCategories(includeInactive = true): Promise<PresetCategoryRow[]> {
  let q = getSupabaseAdmin().from("preset_categories").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    label: r.label as string,
    description: (r.description as string) ?? "",
    sortOrder: (r.sort_order as number) ?? 0,
    active: r.active as boolean,
  }));
}

export async function upsertPresetCategory(input: {
  id?: string;
  slug: string;
  label: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}) {
  const row = {
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
