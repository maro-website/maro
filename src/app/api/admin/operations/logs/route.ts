import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import {
  listAuditEvents,
  listBudgetGuards,
  listFeatureFlags,
  listRecentGenerations,
  listSecurityEvents,
} from "@/lib/operations/logs";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "audit";

  if (kind === "audit") {
    const auth = await requirePermission(req, "audit.view");
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const events = await listAuditEvents(Number(url.searchParams.get("limit") ?? 100));
    return NextResponse.json({ events });
  }

  const auth = await requirePermission(req, "operations.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (kind === "generations") {
    const rows = await listRecentGenerations(Number(url.searchParams.get("limit") ?? 50));
    return NextResponse.json({ generations: rows });
  }

  if (kind === "security") {
    const rows = await listSecurityEvents(Number(url.searchParams.get("limit") ?? 50));
    return NextResponse.json({ events: rows });
  }

  if (kind === "flags") {
    const flags = await listFeatureFlags();
    const guards = await listBudgetGuards();
    return NextResponse.json({ flags, budgetGuards: guards });
  }

  return NextResponse.json({ error: "unknown_kind" }, { status: 400 });
}
