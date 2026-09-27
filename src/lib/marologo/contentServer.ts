import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_LOGO_CONTENT, validateLogoContent } from "./content";
export async function loadLogoContent() {
  const { data, error } = await getSupabaseAdmin().from("app_settings").select("logo_wizard_content").eq("id", 1).single();
  if (error || !data) throw new Error("logo_content_unavailable");
  return data.logo_wizard_content === null ? structuredClone(DEFAULT_LOGO_CONTENT) : validateLogoContent(data.logo_wizard_content);
}
