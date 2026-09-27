import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { loadCommandCenterKpis } from "@/lib/control-center/commandKpis";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "admin.access");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const kpis = await loadCommandCenterKpis();
  return NextResponse.json({ kpis });
}
