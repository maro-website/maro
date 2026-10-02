import { NextResponse } from "next/server";
import { parseMaroStorageAsset, resolveAssetForClient, toStorageRef } from "@/lib/storage/assets";
import {
  getUserFromToken,
  getSupabaseAdmin,
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

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

/** Recover legacy avatar URLs after the generations bucket became private. */
export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const stored = user.user_metadata?.avatar_url;
  const ref = typeof stored === "string" ? parseMaroStorageAsset(stored) : null;
  if (!ref || !ref.path.startsWith("public/avatars/")) return NextResponse.json({ url: null });
  const url = await resolveAssetForClient(toStorageRef(ref.path, ref.bucket));
  return NextResponse.json({ url: url.startsWith("https://") ? url : null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const rl = await enforceRateLimit(req, "upload:avatar", `${user.id}:${ip}`, 20, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAvatar);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { dataUrl?: string };
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const validated = validateRasterUpload({
    dataUrl,
    maxBytes: MAX_USER_IMAGE_BYTES,
    storagePrefix: `public/avatars`,
    userId: user.id,
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
  const { error } = await getSupabaseAdmin().from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) console.warn("[avatar] public profile sync unavailable");
  return NextResponse.json({ url });
}
