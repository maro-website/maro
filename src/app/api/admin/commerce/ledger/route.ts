import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { listCreditLedger } from "@/lib/commerce/ledger";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 100);

  const rows = await listCreditLedger({ userId, type, limit });
  return NextResponse.json({ transactions: rows });
}
