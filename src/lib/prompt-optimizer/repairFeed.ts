import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
import { FEED_PLAN_VERSION, validateFeedPlan } from "@/lib/feed/plan";
import { feedFontReference } from "@/lib/feed/output";
import type { FeedPlannerInput } from "./feed";

/** Revalidate a paid, finished rejection for the identical private input before spending on another plan. */
export async function repairAccountedFeedPlan(input: FeedPlannerInput, fingerprint: string) {
  const db = getSupabaseAdmin();
  const stored = await db.from("maro_optimizer_attempts").select("id,final_prompt,estimated_usd,finished_at")
    .eq("user_id", input.userId).eq("workspace_id", input.workspaceId).eq("fingerprint", fingerprint)
    .eq("version", FEED_PLAN_VERSION).eq("status", "rejected").eq("error_code", "feed_plan_subjects")
    .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (stored.error) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  const row = stored.data;
  if (!row || row.estimated_usd === null || !Number.isFinite(Number(row.estimated_usd)) || Number(row.estimated_usd) < 0 || !row.finished_at || typeof row.final_prompt !== "string" || row.final_prompt.length > 30_000) return;
  let plan: ReturnType<typeof validateFeedPlan>;
  try {
    plan = validateFeedPlan(JSON.parse(row.final_prompt), input.design, input.brief, input.brain, input.contentType, input.textMode);
    for (const post of plan.posts) if (post.headline) await feedFontReference(input.design, post.headline);
  } catch { return; } // Unsupported references, variants, claims or font layouts remain rejected.
  const serialized = JSON.stringify(plan);
  const saved = await db.from("maro_optimizer_attempts").update({ status: "completed", final_prompt: serialized, final_chars: serialized.length, error_code: null })
    .eq("id", row.id).eq("user_id", input.userId).eq("workspace_id", input.workspaceId).eq("fingerprint", fingerprint).eq("status", "rejected").select("id").maybeSingle();
  if (saved.error) throw new ImageRequestValidationError("optimizer_unavailable", 503);
  // Keep every original cost/usage/response field. Admission below still enforces pause, ownership and cache rules.
}
