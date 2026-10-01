import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { resolveEntitlements } from "@/lib/commerce/entitlements";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { normalizeBoundedString } from "@/lib/security/validation";
import { REQUEST_LIMITS } from "@/lib/security/requestLimits";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "no-supabase" }, { status: 503 });
  }

  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = normalizeBoundedString(body.name, REQUEST_LIMITS.billingFieldMax);
  if (!name) return NextResponse.json({ error: "invalid_name" }, { status: 400 });

  const entitlements = await resolveEntitlements(user.id);
  if (!entitlements.can_create_workspace) {
    return NextResponse.json(
      {
        error: "WORKSPACE_LIMIT",
        workspace_limit: entitlements.workspace_limit,
        current_workspace_count: entitlements.current_workspace_count,
      },
      { status: 403 }
    );
  }

  const admin = getSupabaseAdmin();
  const id = `ws_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const sortOrder = entitlements.current_workspace_count;

  const { data, error } = await admin
    .from("workspaces")
    .insert({
      id,
      owner_id: user.id,
      name,
      icon_url: null,
      sort_order: sortOrder,
    })
    .select(
      "id, owner_id, name, icon_url, sort_order, created_at, brand_name, brand_logo_url, brand_primary_color, brand_secondary_color, brand_background_color, brand_text_color"
    )
    .single();

  if (error) {
    if (error.message.includes("WORKSPACE_LIMIT")) {
      return NextResponse.json({ error: "WORKSPACE_LIMIT" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workspace: data });
}
