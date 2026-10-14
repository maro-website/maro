import { getSupabaseAdmin } from "@/lib/supabase/server";
import { GUEST_PRESET_LIMIT } from "./policy";
import { PRESET_TOOLS, type PresetTool } from "./model";
import { isModuleLive } from "@/lib/modules/availability";

/** Select before applying tool/search filters so filters cannot reveal older presets. */
export async function guestPresetIds(tool?: PresetTool): Promise<string[]> {
  const visibleTools = PRESET_TOOLS.filter(value => isModuleLive(value) && (!tool || value === tool));
  const results = await Promise.all(visibleTools.map(value => getSupabaseAdmin().from("maro_prompts")
    .select("id").eq("active", true).eq("status", "published").eq("tool", value)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(GUEST_PRESET_LIMIT)));
  const failed = results.find(result => result.error);
  if (failed) throw failed.error;
  return results.flatMap(result => (result.data ?? []).map(row => row.id as string));
}
