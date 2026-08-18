import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { supabaseServerConfigured, uploadValidatedImage } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import {
  MAX_ADMIN_RASTER_BYTES,
  validateRasterUpload,
} from "@/lib/security/uploadValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAdminUpload);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { dataUrl?: string };

  const validated = validateRasterUpload({
    dataUrl: body.dataUrl ?? "",
    maxBytes: MAX_ADMIN_RASTER_BYTES,
    storagePrefix: "admin-ads",
    userId: auth.admin.userId,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 });
  }

  const url = await uploadValidatedImage(
    validated.bytes,
    validated.storageKey,
    validated.mime
  );
  if (!url) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  return NextResponse.json({ url });
}
