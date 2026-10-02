"use client";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { parseAccountPolicy, type AccountPolicy } from "./accountPolicy";
import { workspaceRequest } from "./request";

export async function fetchAccountPolicy(userId: string, workspaceId?: string): Promise<AccountPolicy> {
  if (!supabaseConfigured) return { brainAccess: true, brainResetAt: null, brainDeleteAt: null, usedBytes: 0, limitBytes: 1000000000 };
  const { data, error } = await workspaceRequest((signal) => getSupabaseBrowser()
    .rpc("maro_account_policy", { p_user: userId, p_workspace: workspaceId ?? null }).abortSignal(signal));
  if (error) throw new Error(error.message);
  return parseAccountPolicy(data);
}
