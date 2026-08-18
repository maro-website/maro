import { NextResponse } from "next/server";
import { runGenerationDebugRetention } from "@/lib/operations/retention";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { authorizeCronRequest } from "@/lib/security/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Policy-driven retention cleanup — generation debug metadata only. */
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

  const retention = await runGenerationDebugRetention();

  const admin = getSupabaseAdmin();
  const failedCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const rateCutoff = new Date(Date.now() - 86400000).toISOString();
  const { data: staleJobs } = await admin
    .from("generation_jobs")
    .select("id")
    .eq("status", "failed")
    .lt("created_at", failedCutoff)
    .limit(500);
  let jobsDeleted = 0;
  for (const job of staleJobs ?? []) {
    await admin.from("generation_jobs").delete().eq("id", (job as { id: string }).id);
    jobsDeleted += 1;
  }
  await admin.from("rate_limit_events").delete().lt("created_at", rateCutoff);

  return NextResponse.json({ ok: true, retention, jobsDeleted });
}

export async function GET(req: Request) {
  return POST(req);
}
