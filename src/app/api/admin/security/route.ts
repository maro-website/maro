import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import {
  getCircuitState,
  setAiPaused,
  getPlatformLimits,
} from "@/lib/security/circuitBreaker";
import { marginPct, TARGET_MARGIN_PCT } from "@/lib/cost/providerCost";
import type { PlatformLimits } from "@/lib/security/platformLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSecurityAdmin(req: Request) {
  return requirePermission(req, "security.manage");
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requireSecurityAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const circuit = await getCircuitState();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [
    { data: recentJobs },
    { data: abuseEvents },
    { data: suspiciousSignups },
    { data: lowMarginJobs },
    { data: refundedTx },
  ] = await Promise.all([
    admin
      .from("generation_jobs")
      .select("id, user_id, module, status, credits_charged, provider_cost_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("abuse_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("signup_signals")
      .select("ip, user_id, created_at")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("generation_jobs")
      .select("id, module, credits_charged, provider_cost_usd, created_at")
      .eq("status", "completed")
      .gte("created_at", dayStart.toISOString())
      .gt("credits_charged", 0)
      .limit(100),
    admin
      .from("credit_transactions")
      .select("id, user_id, amount, created_at, metadata")
      .in("type", ["refund", "release"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const ipCounts = new Map<string, number>();
  for (const s of suspiciousSignups ?? []) {
    const ip = (s as { ip: string }).ip;
    if (ip) ipCounts.set(ip, (ipCounts.get(ip) ?? 0) + 1);
  }
  const suspiciousIps = [...ipCounts.entries()]
    .filter(([, n]) => n >= 3)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const marginFlags = (lowMarginJobs ?? [])
    .map((j) => {
      const row = j as {
        id: string;
        module: string;
        credits_charged: number;
        provider_cost_usd: number;
      };
      const margin = marginPct(row.credits_charged, Number(row.provider_cost_usd ?? 0));
      return { ...row, margin_pct: margin };
    })
    .filter((j) => j.margin_pct < TARGET_MARGIN_PCT && j.credits_charged > 0)
    .slice(0, 15);

  const activeJobs = (recentJobs ?? []).filter((j) =>
    ["pending", "reserved", "processing"].includes((j as { status: string }).status)
  );

  return NextResponse.json({
    circuit,
    activeJobs,
    recentJobs: recentJobs ?? [],
    abuseEvents: abuseEvents ?? [],
    suspiciousIps,
    marginFlags,
    refundedTx: refundedTx ?? [],
  });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requireSecurityAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    action?: "pause_ai" | "resume_ai" | "pause_module" | "resume_module" | "update_limits";
    paused?: boolean;
    module?: string;
    limits?: Partial<PlatformLimits>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  if (body.action === "pause_ai") {
    await setAiPaused(true);
    await admin.from("abuse_events").insert({
      user_id: auth.admin.userId,
      event_type: "admin_pause_ai",
      severity: "critical",
      metadata: {},
    });
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "security.pause_ai",
      targetType: "platform",
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true, aiPaused: true });
  }

  if (body.action === "resume_ai") {
    await setAiPaused(false);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "security.resume_ai",
      targetType: "platform",
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true, aiPaused: false });
  }

  if (body.action === "pause_module" && body.module) {
    const limits = await getPlatformLimits();
    const paused = new Set(limits.pausedModules ?? []);
    paused.add(body.module);
    await admin
      .from("app_settings")
      .update({
        platform_limits: { ...limits, pausedModules: [...paused] },
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "security.pause_module",
      targetType: "module",
      targetId: body.module,
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true, pausedModules: [...paused] });
  }

  if (body.action === "resume_module" && body.module) {
    const limits = await getPlatformLimits();
    const paused = (limits.pausedModules ?? []).filter((m) => m !== body.module);
    await admin
      .from("app_settings")
      .update({
        platform_limits: { ...limits, pausedModules: paused },
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "security.resume_module",
      targetType: "module",
      targetId: body.module,
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true, pausedModules: paused });
  }

  if (body.action === "update_limits" && body.limits) {
    const limits = await getPlatformLimits();
    const next = { ...limits, ...body.limits };
    await admin
      .from("app_settings")
      .update({
        platform_limits: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "security.update_limits",
      targetType: "platform_limits",
      before: limits as unknown as Record<string, unknown>,
      after: next as unknown as Record<string, unknown>,
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad-action" }, { status: 400 });
}
