import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import {
  getShadowComparison,
  listShadowComparisons,
  summarizeShadowComparisons,
  updateShadowReview,
} from "@/lib/engine/shadowCompile";
import type { ShadowReviewStatus } from "@/lib/engine/types";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBool(v: string | null): boolean | undefined {
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const toolId = url.searchParams.get("toolId") ?? undefined;
  const generationId = url.searchParams.get("generationId") ?? undefined;
  const id = url.searchParams.get("id") ?? undefined;
  const summary = url.searchParams.get("summary") === "1";

  if (summary && toolId) {
    const stats = await summarizeShadowComparisons(toolId);
    return NextResponse.json({ summary: stats });
  }

  if (id) {
    const row = await getShadowComparison(id);
    if (!row) return NextResponse.json({ error: "not-found" }, { status: 404 });
    return NextResponse.json({ comparison: row });
  }

  const rows = await listShadowComparisons({
    toolId,
    generationId,
    modelId: url.searchParams.get("model") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    fortEnabled: parseBool(url.searchParams.get("fort")),
    brainUsed: parseBool(url.searchParams.get("brain")),
    compileStatus: (url.searchParams.get("compileStatus") as "success" | "failed") ?? undefined,
    criticalMismatch: parseBool(url.searchParams.get("critical")),
    reviewStatus: (url.searchParams.get("reviewStatus") as ShadowReviewStatus) ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 50),
  });

  return NextResponse.json({ comparisons: rows });
}

export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { id?: string; reviewStatus?: ShadowReviewStatus; reviewNote?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.id || !body.reviewStatus) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const allowed: ShadowReviewStatus[] = [
    "unreviewed",
    "looks_good",
    "needs_fix",
    "expected_difference",
  ];
  if (!allowed.includes(body.reviewStatus)) {
    return NextResponse.json({ error: "invalid_review_status" }, { status: 400 });
  }

  const row = await updateShadowReview({
    id: body.id,
    reviewStatus: body.reviewStatus,
    reviewNote: body.reviewNote,
  });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "engine.shadow_review.update",
    targetType: "engine_shadow_comparisons",
    targetId: body.id,
    after: { reviewStatus: body.reviewStatus, reviewNote: body.reviewNote ?? null },
    requestId: auth.requestId,
  });

  return NextResponse.json({ comparison: row });
}
