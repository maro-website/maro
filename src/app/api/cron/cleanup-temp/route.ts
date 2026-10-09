import { NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { cleanupStaleJobs } from "@/lib/generation/jobs";
import { authorizeCronRequest } from "@/lib/security/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reconcile stale reservations and trim transient rate-limit events. Preserve financial jobs. */
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
  const rateCutoff = new Date(Date.now() - 86400000).toISOString();
  await cleanupStaleJobs();
  const { error } = await admin.from("rate_limit_events").delete().lt("created_at", rateCutoff);
  if (error) return NextResponse.json({ error: "cleanup_failed" }, { status: 503 });
  return NextResponse.json({
    ok: true,
    staleJobsReconciled: true,
    jobsDeleted: 0,
    rateEventsTrimmed: true,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
