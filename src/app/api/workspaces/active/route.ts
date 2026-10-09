import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/payments/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

const schema = z.object({ workspaceId: z.string().min(1).max(200) }).strict();

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = schema.safeParse(parsed.body);
  if (!body.success) return NextResponse.json({ error: "invalid_workspace" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data: workspace, error } = await admin.from("workspaces").select("id")
    .eq("id", body.data.workspaceId).eq("owner_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "workspace_unavailable" }, { status: 503 });
  if (!workspace) return NextResponse.json({ error: "workspace_not_found" }, { status: 404 });
  const { error: updateError } = await admin.from("profiles")
    .update({ active_workspace_id: workspace.id }).eq("id", user.id);
  if (updateError) return NextResponse.json({ error: "workspace_update_failed" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
