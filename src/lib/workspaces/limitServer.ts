import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Same calculator as the database insert trigger; manual overrides survive plan changes. */
export async function getWorkspaceLimit(userId: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc("resolve_workspace_limit", { p_user_id: userId });
  if (error || !Number.isSafeInteger(data) || data < 1) throw new Error("workspace_limit_unavailable");
  return data;
}
