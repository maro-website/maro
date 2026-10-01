import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getPaddle, paddleEnabled } from "@/lib/payments/paddle/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!paddleEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rate = await enforceRateLimit(req, "paddle:portal", user.id, 30, 3600, "strict");
  if (!rate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    const { data, error } = await getSupabaseAdmin().from("credit_orders")
      .select("paddle_customer_id").eq("user_id", user.id).eq("provider", "paddle")
      .eq("status", "paid").not("paddle_customer_id", "is", null)
      .order("paid_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("portal_lookup_failed");
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const session = await getPaddle().customerPortalSessions.create(data.paddle_customer_id, []);
    return NextResponse.json({ url: session.urls.general.overview }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("paddle_portal_failed");
    return NextResponse.json({ error: "portal_unavailable" }, { status: 503 });
  }
}
