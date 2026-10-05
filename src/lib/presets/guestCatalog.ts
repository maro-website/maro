import { getSupabaseAdmin } from "@/lib/supabase/server";
import { GUEST_PRESET_LIMIT } from "./policy";
import { PRESET_TOOLS } from "./model";
import { isModuleLive } from "@/lib/modules/availability";

/** Select before applying tool/search filters so filters cannot reveal older presets. */
export async function guestPresetIds(): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin().from("maro_prompts")
    .select("id").eq("active", true).eq("status", "published")
    .in("tool", PRESET_TOOLS.filter(tool => isModuleLive(tool)))
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(GUEST_PRESET_LIMIT);
  if (error) throw error;
  return (data ?? []).map(row => row.id as string);
}
