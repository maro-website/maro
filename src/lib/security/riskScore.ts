import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Increment user risk score (0–100 cap). Used after limit hits or failed patterns. */
export async function bumpRiskScore(userId: string, delta: number): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("profiles").select("risk_score").eq("id", userId).single();
    const current = (data?.risk_score as number) ?? 0;
    const next = Math.min(100, Math.max(0, current + delta));
    const patch: { risk_score: number; generation_paused?: boolean } = { risk_score: next };
    if (next >= 80) patch.generation_paused = true;
    await admin.from("profiles").update(patch).eq("id", userId);
  } catch {
    /* column may not exist before migration */
  }
}
