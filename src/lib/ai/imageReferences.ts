import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { parseStorageRef, STORAGE_BUCKET } from "@/lib/storage/assets";
import {
  MAX_IMAGE_REFERENCE_BYTES,
  validateRasterBytes,
  type AllowedRasterKind,
} from "@/lib/security/uploadValidation";

export const PROVIDER_REFERENCE_MAX_DIMENSION = 4096;
export const PROVIDER_REFERENCE_REENCODE_BYTES = 12 * 1024 * 1024;

export type ResolvedImageReference = {
  dataUrl: string;
  digest: string;
  mime: string;
  normalized: boolean;
};

function ownedPrivateReference(value: string, userId: string) {
  const ref = parseStorageRef(value);
  if (!ref || ref.bucket !== STORAGE_BUCKET) return null;
  const [owner] = ref.path.split("/");
  if (!owner || owner !== userId || ref.path.includes("..")) return null;
  return ref;
}

export async function normalizeImageReferenceForProvider(
  bytes: Buffer,
  mediaType: AllowedRasterKind
): Promise<{ bytes: Buffer; mime: string; normalized: boolean }> {
  const image = sharp(bytes, { failOn: "error" });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const shouldNormalize =
    Math.max(width, height) > PROVIDER_REFERENCE_MAX_DIMENSION ||
    bytes.length > PROVIDER_REFERENCE_REENCODE_BYTES;
  const mime = mediaType === "png" ? "image/png" : mediaType === "webp" ? "image/webp" : "image/jpeg";
  if (!shouldNormalize) return { bytes, mime, normalized: false };

  let pipeline = sharp(bytes, { failOn: "error" }).rotate().resize({
    width: PROVIDER_REFERENCE_MAX_DIMENSION,
    height: PROVIDER_REFERENCE_MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });
  if (mediaType === "png") pipeline = pipeline.png({ compressionLevel: 9 });
  else if (mediaType === "webp") pipeline = pipeline.webp({ quality: 92, alphaQuality: 100 });
  else pipeline = pipeline.jpeg({ quality: 92, chromaSubsampling: "4:4:4" });
  return { bytes: await pipeline.toBuffer(), mime, normalized: true };
}

export async function resolvePrivateImageReference(
  storageRef: string,
  userId: string
): Promise<ResolvedImageReference> {
  const ref = ownedPrivateReference(storageRef, userId);
  if (!ref) throw new Error("forbidden_reference");
  const { data, error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).download(ref.path);
  if (error || !data) throw new Error("reference_not_found");
  const bytes = Buffer.from(await data.arrayBuffer());
  const validated = validateRasterBytes(bytes, MAX_IMAGE_REFERENCE_BYTES, data.type || undefined);
  if (!validated.ok) throw new Error(validated.reason);
  const output = await normalizeImageReferenceForProvider(validated.bytes, validated.mediaType);
  return {
    dataUrl: `data:${output.mime};base64,${output.bytes.toString("base64")}`,
    digest: createHash("sha256").update(output.bytes).digest("hex"),
    mime: output.mime,
    normalized: output.normalized,
  };
}
