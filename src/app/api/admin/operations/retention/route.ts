import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { evaluateBudgetGuards, listActiveBudgetGuards } from "@/lib/operations/budgetGuards";
import {
  listRecentRetentionRuns,
  listRetentionPolicies,
  runGenerationDebugRetention,
} from "@/lib/operations/retention";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "operations.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const [policies, runs, guards, evaluations] = await Promise.all([
    listRetentionPolicies(),
    listRecentRetentionRuns(),
    listActiveBudgetGuards(),
    evaluateBudgetGuards(),
  ]);

  if (url.searchParams.get("section") === "retention") {
    return NextResponse.json({ policies, runs });
  }

  return NextResponse.json({ policies, runs, guards, evaluations, estimated: true });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "security.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { action?: "run_retention" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.action === "run_retention") {
    const result = await runGenerationDebugRetention();
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
