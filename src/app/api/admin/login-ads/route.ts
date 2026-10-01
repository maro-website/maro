import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import {
  deleteLoginAd,
  getLoginAd,
  listLoginAds,
  upsertLoginAd,
} from "@/lib/loginAds/server";
import { isSafeExternalUrl } from "@/lib/loginAds/types";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { deletePublicAsset, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SaveLoginAdBody = {
  id?: unknown;
  imageUrl?: unknown;
  imagePath?: unknown;
  externalUrl?: unknown;
  weight?: unknown;
  active?: unknown;
};

function configuredResponse() {
  return NextResponse.json({ error: "not-configured" }, { status: 503 });
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return configuredResponse();
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    return NextResponse.json({ ads: await listLoginAds() });
  } catch {
    return NextResponse.json({ error: "login-ads-unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return configuredResponse();
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as SaveLoginAdBody;
  const id = typeof body.id === "string" && body.id ? body.id : undefined;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const imagePath = typeof body.imagePath === "string" ? body.imagePath.trim() : "";
  const externalUrl = typeof body.externalUrl === "string" ? body.externalUrl.trim() : "";
  const weight = typeof body.weight === "number" ? body.weight : Number(body.weight);
  const active = body.active !== false;

  if (id && !UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid-id" }, { status: 400 });
  }
  if (!imageUrl.startsWith("https://") || !imagePath.startsWith("admin-ads/")) {
    return NextResponse.json({ error: "invalid-image" }, { status: 400 });
  }
  if (!isSafeExternalUrl(externalUrl)) {
    return NextResponse.json({ error: "invalid-external-url" }, { status: 400 });
  }
  if (!Number.isInteger(weight) || weight < 1 || weight > 5) {
    return NextResponse.json({ error: "invalid-weight" }, { status: 400 });
  }

  try {
    const before = id ? await getLoginAd(id) : null;
    if (id && !before) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }
    const ad = await upsertLoginAd({
      id,
      imageUrl,
      imagePath,
      externalUrl,
      weight,
      active,
      createdBy: auth.admin.userId,
    });
    if (before && before.imagePath !== imagePath) {
      await deletePublicAsset(before.imagePath);
    }
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: id ? "login_ads.update" : "login_ads.create",
      targetType: "login_ad",
      targetId: ad.id,
      before: before ? { ...before } : null,
      after: { ...ad },
    });
    return NextResponse.json({ ad });
  } catch {
    return NextResponse.json({ error: "login-ad-save-failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) return configuredResponse();
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid-id" }, { status: 400 });
  }

  try {
    const removed = await deleteLoginAd(id);
    if (!removed) return NextResponse.json({ error: "not-found" }, { status: 404 });
    await deletePublicAsset(removed.imagePath);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "login_ads.delete",
      targetType: "login_ad",
      targetId: id,
      before: { ...removed },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "login-ad-delete-failed" }, { status: 500 });
  }
}
