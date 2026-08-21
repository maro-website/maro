import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  resolveAssetForClient,
  supabaseServerConfigured,
  uploadValidatedImage,
} from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { MAX_USER_IMAGE_BYTES, validateRasterUpload } from "@/lib/security/uploadValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7) : header;
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = await enforceRateLimit(req, "upload:workspace-asset", `${user.id}:${clientIp(req)}`, 40, 3600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonProjectAsset);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { dataUrl?: string; workspaceId?: string };
  if (!body.workspaceId?.trim()) return NextResponse.json({ error: "workspace_required" }, { status: 400 });

  const { data: workspace } = await getSupabaseAdmin()
    .from("workspaces")
    .select("id")
    .eq("id", body.workspaceId.trim())
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) return NextResponse.json({ error: "workspace_not_found" }, { status: 404 });

  const prefix = `${user.id}/workspace-assets/${workspace.id}`;
  const validated = validateRasterUpload({
    dataUrl: typeof body.dataUrl === "string" ? body.dataUrl : "",
    maxBytes: MAX_USER_IMAGE_BYTES,
    storagePrefix: prefix,
    userId: user.id,
  });
  if (!validated.ok) return NextResponse.json({ error: validated.reason }, { status: 400 });
  const filename = validated.storageKey.split("/").at(-1);
  if (!filename) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  const storageRef = await uploadValidatedImage(validated.bytes, `${prefix}/${filename}`, validated.mime);
  if (!storageRef) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  return NextResponse.json({ storageRef, url: await resolveAssetForClient(storageRef) });
}
