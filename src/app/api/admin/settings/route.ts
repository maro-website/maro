import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { z } from "zod";

export const dynamic = "force-dynamic";
const fields = "master_prompt,tool_prompts,pricing,tool_option_icons";
const object = z.record(z.string(), z.unknown());
const patchSchema = z.object({
  master_prompt: z.string().max(100_000).optional(),
  tool_prompts: z.record(z.string().max(100), z.string().max(100_000)).optional(),
  pricing: object.optional(),
  tool_option_icons: object.optional(),
  updated_at: z.string().optional(), // Compatibility only; server sets the timestamp.
}).strict();

export async function GET(req: Request) {
  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await getSupabaseAdmin().from("app_settings").select(fields).eq("id", 1).single();
  if (error) return NextResponse.json({ error: "settings_unavailable" }, { status: 503 });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!parsed.ok) return parsed.response;
  const checked = patchSchema.safeParse(parsed.body);
  if (!checked.success) return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  const { updated_at: _ignored, ...patch } = checked.data;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "empty_settings" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("app_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return NextResponse.json({ error: "settings_save_failed" }, { status: 503 });
  await writeAuditEvent({ actorId: auth.admin.userId, action: "settings.updated", targetType: "app_settings", targetId: "1", requestId: auth.requestId, metadata: { fields: Object.keys(patch) } });
  return NextResponse.json({ ok: true });
}
