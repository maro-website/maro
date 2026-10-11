import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePermission(req, "analytics.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { data, error } = await getSupabaseAdmin().rpc("admin_online_presence");
    if (error || !data) throw new Error("unavailable");
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "presence_unavailable" }, { status: 503 });
  }
}
