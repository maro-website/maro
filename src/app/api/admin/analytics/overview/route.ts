import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import {
  getAnalyticsOverview,
  getGenerationsByTool,
  getRevenueByMonth,
  getUserSignupTrend,
} from "@/lib/analytics/aggregates";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "analytics.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const section = url.searchParams.get("section") ?? "overview";

  if (section === "overview") {
    return NextResponse.json({ overview: await getAnalyticsOverview() });
  }
  if (section === "tools") {
    return NextResponse.json({ byTool: await getGenerationsByTool() });
  }
  if (section === "revenue") {
    return NextResponse.json({ byMonth: await getRevenueByMonth() });
  }
  if (section === "users") {
    return NextResponse.json({ signups: await getUserSignupTrend() });
  }

  return NextResponse.json({ error: "unknown_section" }, { status: 400 });
}
