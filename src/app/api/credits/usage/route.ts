import { NextResponse } from "next/server";
import { fetchCreditUsage } from "@/lib/credits/usageServer";
import { requireUser } from "@/lib/payments/auth";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const OPTIONS = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { ...OPTIONS, status: 401 });
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "credit_usage_unavailable" }, { ...OPTIONS, status: 503 });
  try {
    return NextResponse.json(await fetchCreditUsage(user.id), OPTIONS);
  } catch {
    return NextResponse.json({ error: "credit_usage_unavailable" }, { ...OPTIONS, status: 503 });
  }
}
