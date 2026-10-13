import { NextResponse } from "next/server";
import { uploadValidatedImage } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/security/requestLimits";
import { MAX_ADMIN_RASTER_BYTES, validateRasterUpload } from "@/lib/security/uploadValidation";
import { requireMoodAdmin, MOOD_HEADERS } from "@/lib/moods/server";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const auth = await requireMoodAdmin(req);
  if (!auth.ok) return auth.response;
  const parsed = await readJsonBody(req, Math.ceil(MAX_ADMIN_RASTER_BYTES * 4 / 3) + 4096);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { dataUrl?: unknown } | null;
  if (!body || typeof body.dataUrl !== "string") return NextResponse.json({ error: "invalid-image" }, { status: 400 });
  const raster = validateRasterUpload({ dataUrl: body.dataUrl, maxBytes: MAX_ADMIN_RASTER_BYTES, storagePrefix: "public/moods", userId: auth.user.id });
  if (!raster.ok) return NextResponse.json({ error: raster.reason }, { status: 400 });
  const url = await uploadValidatedImage(raster.bytes, raster.storageKey, raster.mime);
  return NextResponse.json(url ? { url } : { error: "upload-failed" }, { status: url ? 200 : 503, headers: MOOD_HEADERS });
}
