import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/security/requestLimits";
import { MAX_USER_IMAGE_BYTES, validateRasterUpload } from "@/lib/security/uploadValidation";
import { moderateStyle } from "@/lib/moods/ai";
import { styleRateLimit } from "@/lib/moods/mutations";
import { requireMoodUser, requireMoodAdmin, styleResponse, styleFailure, StyleError } from "@/lib/moods/server";
export async function uploadStyleCover(req: Request, admin = false) {
  try {
    const auth = admin ? await requireMoodAdmin(req) : await requireMoodUser(req);
    if (!auth.ok) return auth.response;
    const parsed = await readJsonBody(req, Math.ceil(MAX_USER_IMAGE_BYTES * 4 / 3) + 4096);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body as { dataUrl?: unknown } | null;
    if (!body || typeof body.dataUrl !== "string") throw new StyleError("invalid_style_cover");
    const raster = validateRasterUpload({ dataUrl: body.dataUrl, maxBytes: MAX_USER_IMAGE_BYTES, storagePrefix: "_moods", userId: auth.user.id });
    if (!raster.ok) throw new StyleError("invalid_style_cover");
    await styleRateLimit(auth.user.id, "upload", 30);
    let bytes: Buffer;
    try {
      bytes = await sharp(raster.bytes, { limitInputPixels: 24_000_000, animated: false }).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { throw new StyleError("invalid_style_cover"); }
    await moderateStyle("User-submitted visual style thumbnail", `data:image/webp;base64,${bytes.toString("base64")}`);
    const path = `_moods/${auth.user.id}/${randomUUID()}.webp`, storage = getSupabaseAdmin().storage.from("generations");
    const uploaded = await storage.upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (uploaded.error) throw new StyleError("style_upload_failed", 503);
    const signed = await storage.createSignedUrl(path, 120);
    if (signed.error || !signed.data?.signedUrl) throw new StyleError("style_upload_failed", 503);
    return styleResponse({ cover_ref: `storage:generations/${path}`, url: signed.data.signedUrl });
  } catch (error) { return styleFailure(error); }
}
