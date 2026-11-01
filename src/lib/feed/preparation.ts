import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const FEED_PREPARATION_WINDOW_MS = 120_000;
export type FeedPreparationAttempt = { id: string; request_key: string; status: string; created_at: string };
export async function latestFeedPreparation(userId: string, workspaceId: string, requestId: string) {
  const result = await getSupabaseAdmin().from("maro_optimizer_attempts").select("id,request_key,status,created_at")
    .eq("user_id", userId).eq("workspace_id", workspaceId).like("request_key", `feed-plan:${requestId}%`).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error("feed_preparation_lookup_failed");
  return result.data as FeedPreparationAttempt | null;
}
export function feedPreparationStatus(row: FeedPreparationAttempt | null, now = Date.now()) {
  if (!row) return { state: "missing" as const };
  if (row.status === "completed") return { state: "prepared" as const, createdAt: row.created_at };
  if (["running", "uncertain"].includes(row.status) && now - Date.parse(row.created_at) < FEED_PREPARATION_WINDOW_MS) return { state: "running" as const, createdAt: row.created_at };
  if (row.status === "running" || row.status === "uncertain") return { state: "interrupted" as const, error: "feed_preparation_interrupted", createdAt: row.created_at };
  return { state: "failed" as const, error: row.status === "rejected" ? "feed_plan_invalid" : "optimizer_unavailable", createdAt: row.created_at };
}
/** Explicit retry gets a separate cost reservation; the customer Feed request and atomic charge key stay identical. */
export function feedPreparationKey(requestId: string, row: FeedPreparationAttempt | null) {
  const base = `feed-plan:${requestId}`;
  if (!row) return base;
  return feedPreparationStatus(row).state === "interrupted" ? `${base}:retry:${row.id}` : row.request_key;
}
