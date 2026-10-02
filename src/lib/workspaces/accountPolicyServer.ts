import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { parseAccountPolicy } from "./accountPolicy";

export class AccountPolicyError extends Error {
  constructor(code: string, public readonly status: number) { super(code); }
}

export async function getAccountPolicy(userId: string, workspaceId?: string) {
  const { data, error } = await getSupabaseAdmin().rpc("maro_account_policy", {
    p_user: userId, p_workspace: workspaceId ?? null,
  });
  if (error) throw new AccountPolicyError("account_policy_unavailable", 503);
  try { return parseAccountPolicy(data); }
  catch { throw new AccountPolicyError("account_policy_unavailable", 503); }
}

export async function requireBrainAccess(userId: string, workspaceId?: string) {
  const policy = await getAccountPolicy(userId, workspaceId);
  if (!policy.brainAccess) throw new AccountPolicyError("brain_plan_required", 403);
  return policy;
}

export async function requireStorageSpace(userId: string, incomingBytes = 1) {
  const policy = await getAccountPolicy(userId);
  if (policy.limitBytes !== null && policy.usedBytes + incomingBytes > policy.limitBytes) {
    throw new AccountPolicyError("storage_quota_exceeded", 413);
  }
  return policy;
}

/** The existing reconciliation schedule performs physical deletion through Storage API. */
export async function cleanupExpiredBrains() {
  const admin = getSupabaseAdmin();
  const reset = await admin.rpc("maro_reset_expired_brains", { p_limit: 200 });
  if (reset.error) throw new Error("brain_retention_unavailable");
  const { data, error } = await admin.from("brain_retention_files").select("path").limit(200);
  if (error) throw new Error("brain_retention_unavailable");
  if (data?.length) {
    const paths = data.map((row: { path: string }) => row.path);
    const removed = await admin.storage.from("generations").remove(paths);
    if (removed.error) throw new Error("brain_retention_storage_unavailable");
    const acknowledged = await admin.from("brain_retention_files").delete().in("path", paths);
    if (acknowledged.error) throw new Error("brain_retention_unavailable");
  }
  return Number(reset.data ?? 0);
}
