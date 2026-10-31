import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { optimizerUsageSummary } from "@/lib/prompt-optimizer/server";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(req: Request) {
  const auth = await requirePermission(req, "security.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  if (auth.admin.role !== "super_admin") return NextResponse.json({ error: "insufficient_permission" }, { status: 403, headers });
  const rate = await checkRateLimit("admin_optimizer_usage", auth.admin.userId, 30, 60, "strict");
  if (!rate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfter) } });
  try {
    const summary = await optimizerUsageSummary();
    const audit = await getSupabaseAdmin().from("audit_events").insert({ actor_id: auth.admin.userId, action: "optimizer.usage.viewed",
      target_type: "provider_cost", request_id: auth.requestId, metadata: { key_alias: "maro_optimizer" } });
    if (audit.error) throw new Error("audit_unavailable");
    return NextResponse.json(summary, { headers });
  }
  catch { return NextResponse.json({ error: "optimizer_usage_unavailable" }, { status: 503, headers }); }
}
