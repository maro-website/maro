import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getPurchaseCatalog } from "@/lib/commerce/catalog";
import {
  invalidateCommerceConfigCache,
  loadCommercePlans,
  loadCommerceTopups,
} from "@/lib/commerce/plans";
import { getAppSettings, getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CANONICAL_PLAN_IDS = new Set(["standard", "pro", "business"]);

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [purchase, settings, plans, topups] = await Promise.all([
    getPurchaseCatalog(),
    getAppSettings(),
    loadCommercePlans({ includeDisabled: true }),
    loadCommerceTopups({ includeDisabled: true }),
  ]);

  return NextResponse.json({
    purchase,
    plans,
    topups,
    generationPricing: settings.pricing,
  });
}

export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  const admin = getSupabaseAdmin();

  if (kind === "plan") {
    const id = String(body.id ?? "");
    if (!CANONICAL_PLAN_IDS.has(id)) {
      return NextResponse.json({ error: "immutable_plan_id" }, { status: 400 });
    }
    const patch = body.patch as Record<string, unknown> | undefined;
    if (!patch) return NextResponse.json({ error: "missing_patch" }, { status: 400 });

    const allowed = [
      "enabled",
      "display_name",
      "description",
      "price_cents",
      "included_credits",
      "duration_days",
      "workspace_limit",
      "concurrency_limit",
      "renewal_window_days",
      "recommended_badge",
      "sort_order",
    ];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in patch) update[key] = patch[key];
    }

    const { error } = await admin.from("commerce_plans").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateCommerceConfigCache();
    return NextResponse.json({ ok: true });
  }

  if (kind === "topup") {
    const id = String(body.id ?? "");
    const patch = body.patch as Record<string, unknown> | undefined;
    if (!id || !patch) return NextResponse.json({ error: "invalid_topup" }, { status: 400 });

    const allowed = ["enabled", "credits", "price_cents", "sort_order", "requires_active_plan"];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in patch) update[key] = patch[key];
    }

    const { error } = await admin.from("commerce_topups").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateCommerceConfigCache();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_kind" }, { status: 400 });
}
