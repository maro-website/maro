import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  resolveAssetForClient,
  storagePrefixUsageBytes,
  supabaseServerConfigured,
  uploadValidatedImage,
} from "@/lib/supabase/server";
import { parseStorageRef, STORAGE_BUCKET, toStorageRef } from "@/lib/storage/assets";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import {
  buildStorageKey,
  MAX_IMAGE_REFERENCE_BYTES,
  MAX_USER_IMAGE_BYTES,
  validateRasterBytes,
  validateRasterUpload,
} from "@/lib/security/uploadValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_PROJECT_ASSET_QUOTA_BYTES = 500 * 1024 * 1024;

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7) : header;
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rateLimit = await enforceRateLimit(
    req,
    "upload:project-asset",
    `${user.id}:${clientIp(req)}`,
    100,
    3600
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonProjectAsset);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as {
    action?: "prepare" | "finalize";
    purpose?: "project-asset" | "image-reference";
    name?: string;
    type?: string;
    size?: number;
    storageRef?: string;
    dataUrl?: string;
  };
  const storagePrefix = `${user.id}/project-assets`;

  if (body.action === "prepare") {
    const purpose = body.purpose === "image-reference" ? "image-reference" : "project-asset";
    const maxBytes = purpose === "image-reference" ? MAX_IMAGE_REFERENCE_BYTES : MAX_USER_IMAGE_BYTES;
    const size = Number(body.size);
    if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    if (!/^image\/(?:png|jpe?g|webp)$/i.test(body.type ?? "")) {
      return NextResponse.json({ error: "unsupported_mime" }, { status: 400 });
    }
    const extension = /png/i.test(body.type!) ? "png" : /webp/i.test(body.type!) ? "webp" : "jpg";
    const storageKey = buildStorageKey(storagePrefix, "upload", extension)
      .replace(`${storagePrefix}/upload/`, `${storagePrefix}/`);
    try {
      const usage = await storagePrefixUsageBytes(storagePrefix);
      if (usage + size > FREE_PROJECT_ASSET_QUOTA_BYTES) {
        return NextResponse.json(
          { error: "storage_quota_exceeded", quotaBytes: FREE_PROJECT_ASSET_QUOTA_BYTES },
          { status: 413 }
        );
      }
      const { data, error } = await getSupabaseAdmin()
        .storage.from(STORAGE_BUCKET)
        .createSignedUploadUrl(storageKey);
      if (error || !data?.token) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
      return NextResponse.json({
        path: storageKey,
        uploadToken: data.token,
        storageRef: toStorageRef(storageKey),
      });
    } catch {
      return NextResponse.json({ error: "storage-usage-unavailable" }, { status: 503 });
    }
  }

  if (body.action === "finalize") {
    const purpose = body.purpose === "image-reference" ? "image-reference" : "project-asset";
    const maxBytes = purpose === "image-reference" ? MAX_IMAGE_REFERENCE_BYTES : MAX_USER_IMAGE_BYTES;
    const ref = parseStorageRef(body.storageRef ?? "");
    if (
      !ref ||
      ref.bucket !== STORAGE_BUCKET ||
      !ref.path.startsWith(`${storagePrefix}/`) ||
      ref.path.includes("..")
    ) {
      return NextResponse.json({ error: "forbidden_ref" }, { status: 403 });
    }
    const store = getSupabaseAdmin().storage.from(STORAGE_BUCKET);
    const { data: info, error: infoError } = await store.info(ref.path);
    const actualSize = Number((info as { size?: unknown } | null)?.size ?? 0);
    if (infoError || !Number.isFinite(actualSize) || actualSize <= 0) {
      return NextResponse.json({ error: "upload-failed" }, { status: 400 });
    }
    if (actualSize > maxBytes) {
      await store.remove([ref.path]);
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    const { data: blob, error: downloadError } = await store.download(ref.path);
    if (downloadError || !blob) return NextResponse.json({ error: "upload-failed" }, { status: 400 });
    const validatedBytes = validateRasterBytes(Buffer.from(await blob.arrayBuffer()), maxBytes, blob.type || undefined);
    if (!validatedBytes.ok) {
      await store.remove([ref.path]);
      return NextResponse.json({ error: validatedBytes.reason }, { status: 400 });
    }
    const storageRef = toStorageRef(ref.path);
    return NextResponse.json({ storageRef, url: await resolveAssetForClient(storageRef) });
  }

  // Backward-compatible data-URL upload for existing maroWeb drafts. New image
  // references use the signed direct-upload flow above.
  const validated = validateRasterUpload({
    dataUrl: typeof body.dataUrl === "string" ? body.dataUrl : "",
    maxBytes: MAX_USER_IMAGE_BYTES,
    storagePrefix,
    userId: user.id,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 });
  }

  try {
    const usage = await storagePrefixUsageBytes(storagePrefix);
    if (usage + validated.bytes.length > FREE_PROJECT_ASSET_QUOTA_BYTES) {
      return NextResponse.json(
        { error: "storage_quota_exceeded", quotaBytes: FREE_PROJECT_ASSET_QUOTA_BYTES },
        { status: 413 }
      );
    }
  } catch {
    return NextResponse.json({ error: "storage-usage-unavailable" }, { status: 503 });
  }

  // validateRasterUpload appends the owner once more for generic upload routes.
  // Keep the private bucket's first segment canonical and avoid persisting a
  // signed URL as the asset identity.
  const filename = validated.storageKey.split("/").at(-1);
  if (!filename) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  const storageKey = `${storagePrefix}/${filename}`;
  const storageRef = await uploadValidatedImage(validated.bytes, storageKey, validated.mime);
  if (!storageRef) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  const url = await resolveAssetForClient(storageRef);
  return NextResponse.json({ url, storageRef, quotaBytes: FREE_PROJECT_ASSET_QUOTA_BYTES });
}
