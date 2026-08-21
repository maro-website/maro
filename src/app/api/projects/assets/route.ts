import { NextResponse } from "next/server";
import {
  getUserFromToken,
  resolveAssetForClient,
  storagePrefixUsageBytes,
  supabaseServerConfigured,
  uploadValidatedImage,
} from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import {
  MAX_USER_IMAGE_BYTES,
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
  const body = parsed.body as { dataUrl?: string };
  const storagePrefix = `${user.id}/project-assets`;
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
