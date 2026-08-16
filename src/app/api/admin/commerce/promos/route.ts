import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { deletePromoCode, listPromoCodes, upsertPromoCode } from "@/lib/commerce/promos";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const promos = await listPromoCodes();
  return NextResponse.json({ promos });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    action?: "delete";
    id?: string;
    code?: string;
    slug?: string | null;
    discountPercent?: number;
    active?: boolean;
    creatorId?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.action === "delete" && body.id) {
    await deletePromoCode(body.id);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "commerce.promo.delete",
      targetType: "promo_codes",
      targetId: body.id,
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.code?.trim()) return NextResponse.json({ error: "code_required" }, { status: 400 });

  const row = await upsertPromoCode({
    id: body.id,
    code: body.code,
    slug: body.slug,
    discountPercent: body.discountPercent ?? 10,
    active: body.active ?? true,
    creatorId: body.creatorId,
  });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: body.id ? "commerce.promo.update" : "commerce.promo.create",
    targetType: "promo_codes",
    targetId: row.id as string,
    after: row,
    requestId: auth.requestId,
  });

  return NextResponse.json({ promo: row });
}
