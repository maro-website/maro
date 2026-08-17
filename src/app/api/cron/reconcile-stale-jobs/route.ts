import { NextResponse } from "next/server";
import { cleanupStaleJobs } from "@/lib/generation/jobs";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

function authorized(req: Request): boolean {
  if (!CRON_SECRET) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${CRON_SECRET}`;
}

/** Release reserved credits and fail generation jobs stuck in-flight past the stale threshold. */
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await cleanupStaleJobs();

  return NextResponse.json({ ok: true, staleJobsReconciled: true });
}

export async function GET(req: Request) {
  return POST(req);
}
