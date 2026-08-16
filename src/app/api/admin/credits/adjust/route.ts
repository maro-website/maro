import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { adminAdjustCredits, adminSetCredits } from "@/lib/credits/adminAdjust";
import { emitProductEvent } from "@/lib/events/productEvents";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "credits.adjust");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    userId?: string;
    mode?: "delta" | "set";
    delta?: number;
    newBalance?: number;
    reason?: string;
    idempotencyKey?: string;
    generationId?: string;
    paymentId?: string;
    reportId?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  if (!userId) return NextResponse.json({ error: "missing_user" }, { status: 400 });
  if (!reason || reason.length < 3) {
    return NextResponse.json({ error: "reason_required" }, { status: 400 });
  }

  const metadata: Record<string, unknown> = {};
  if (body.generationId) metadata.generation_id = body.generationId;
  if (body.paymentId) metadata.payment_id = body.paymentId;
  if (body.reportId) metadata.report_id = body.reportId;

  const idempotencyKey = body.idempotencyKey?.trim() || null;

  let result;
  if (body.mode === "set") {
    const newBalance = Number(body.newBalance);
    if (!Number.isInteger(newBalance) || newBalance < 0) {
      return NextResponse.json({ error: "invalid_balance" }, { status: 400 });
    }
    result = await adminSetCredits({
      actorId: auth.admin.userId,
      userId,
      newBalance,
      reason,
      idempotencyKey,
      metadata,
    });
  } else {
    const delta = Number(body.delta);
    if (!Number.isInteger(delta) || delta === 0) {
      return NextResponse.json({ error: "invalid_delta" }, { status: 400 });
    }
    result = await adminAdjustCredits({
      actorId: auth.admin.userId,
      userId,
      delta,
      reason,
      idempotencyKey,
      metadata,
    });
  }

  if (!result.ok) {
    const status =
      result.error === "insufficient_balance"
        ? 400
        : result.error === "user_not_found"
          ? 404
          : result.error === "rpc_missing"
            ? 503
            : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (!result.already) {
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "credits.adjusted",
      targetType: "user",
      targetId: userId,
      after: {
        balance: result.balance,
        old_balance: result.oldBalance,
        delta: result.delta,
        reason,
      },
      requestId: auth.requestId,
      metadata,
    });

    await emitProductEvent({
      eventName: "admin_credits_adjusted",
      userId,
      metadata: {
        actor_id: auth.admin.userId,
        delta: result.delta,
        balance: result.balance,
        reason,
        dedupe_key: idempotencyKey ?? `${userId}-${Date.now()}`,
      },
      dedupeKey: idempotencyKey ?? undefined,
    });
  }

  return NextResponse.json({
    ok: true,
    balance: result.balance,
    oldBalance: result.oldBalance,
    delta: result.delta,
    already: result.already ?? false,
  });
}
