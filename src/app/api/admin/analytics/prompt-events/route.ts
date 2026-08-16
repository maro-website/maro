import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "analytics.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "8000", 10) || 8000, 10000);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("prompt_events")
    .select("kind, tool_id, prompt, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = data ?? [];
  const totalViews = events.filter((e) => e.kind === "view").length;
  const totalCopies = events.filter((e) => e.kind === "copy").length;

  return NextResponse.json({
    events,
    summary: { totalViews, totalCopies },
  });
}
