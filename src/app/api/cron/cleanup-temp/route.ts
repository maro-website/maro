import { NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { cleanupStaleJobs } from "@/lib/generation/jobs";
import { authorizeCronRequest } from "@/lib/security/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Delete stale failed jobs and trim old rate-limit events. */
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

  const admin = getSupabaseAdmin();
  const failedCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const rateCutoff = new Date(Date.now() - 86400000).toISOString();

  await cleanupStaleJobs();

  const { data: staleJobs } = await admin
    .from("generation_jobs")
    .select("id, metadata")
    .eq("status", "failed")
    .lt("created_at", failedCutoff)
    .limit(500);

  let jobsDeleted = 0;
  for (const job of staleJobs ?? []) {
    const meta = (job as { metadata?: { tempPaths?: string[] } }).metadata;
    void meta?.tempPaths;
    await admin.from("generation_jobs").delete().eq("id", (job as { id: string }).id);
    jobsDeleted += 1;
  }

  await admin.from("rate_limit_events").delete().lt("created_at", rateCutoff);

  return NextResponse.json({
    ok: true,
    staleJobsReconciled: true,
    jobsDeleted,
    rateEventsTrimmed: true,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
