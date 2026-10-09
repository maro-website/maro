import { NextResponse } from "next/server";
import { cleanupStaleJobs } from "@/lib/generation/jobs";
import { supabaseServerConfigured } from "@/lib/supabase/server";
import { authorizeCronRequest } from "@/lib/security/cronAuth";
import { cleanupExpiredBrains } from "@/lib/workspaces/accountPolicyServer";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { repairGenerationAccounting } from "@/lib/operations/accountingRepair";
import { runGenerationDebugRetention } from "@/lib/operations/retention";
import { runPlanRenewalReminders } from "@/lib/commerce/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Release reserved credits and fail generation jobs stuck in-flight past the stale threshold. */
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = authorizeCronRequest(req);
  if (auth === "misconfigured") {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  if (auth === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await cleanupStaleJobs();
    const brainsReset = await cleanupExpiredBrains();
    const accountingRepaired = await repairGenerationAccounting();
    const retention = await runGenerationDebugRetention();
    if (!retention.ok) throw new Error("retention_failed");
    const { error } = await getSupabaseAdmin().from("rate_limit_events").delete()
      .lt("created_at", new Date(Date.now() - 86400000).toISOString());
    if (error) throw new Error("rate_cleanup_failed");
    const renewal = await runPlanRenewalReminders();
    return NextResponse.json({ ok: true, staleJobsReconciled: true, brainsReset,
      accountingRepaired, retentionRows: retention.rowsAffected, renewal });
  } catch {
    console.error("[v1-maintenance] one or more tasks failed");
    return NextResponse.json({ error: "maintenance_failed" }, { status: 503 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
