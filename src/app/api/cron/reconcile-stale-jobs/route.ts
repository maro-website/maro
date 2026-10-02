import { NextResponse } from "next/server";
import { cleanupStaleJobs } from "@/lib/generation/jobs";
import { supabaseServerConfigured } from "@/lib/supabase/server";
import { authorizeCronRequest } from "@/lib/security/cronAuth";
import { cleanupExpiredBrains } from "@/lib/workspaces/accountPolicyServer";

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

  await cleanupStaleJobs();
  const brainsReset = await cleanupExpiredBrains();

  return NextResponse.json({ ok: true, staleJobsReconciled: true, brainsReset });
}

export async function GET(req: Request) {
  return POST(req);
}
