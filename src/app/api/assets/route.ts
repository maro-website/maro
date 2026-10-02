import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { isOwnedPrivateAssetPath, parseStorageRef, signStoragePath, STORAGE_BUCKET, toStorageRef } from "@/lib/storage/assets";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

/** Browse existing uploads. The authenticated owner determines the storage prefix. */
export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return NextResponse.json({ error: "invalid_offset" }, { status: 400 });
  try {
    const prefix = `${user.id}/project-assets`;
    const { data, error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).list(prefix, {
      limit: PAGE_SIZE, offset, sortBy: { column: "created_at", order: "desc" },
    });
    if (error || !data) return NextResponse.json({ error: "asset-library-unavailable" }, { status: 503 });
    const assets = await Promise.all(data.filter(file => file.id && /\.(png|jpe?g|webp)$/i.test(file.name)).map(async file => {
      const path = `${prefix}/${file.name}`;
      if (!isOwnedPrivateAssetPath(path, user.id)) return null;
      const url = await signStoragePath(path);
      if (!url) throw new Error("preview-unavailable");
      return { storageRef: toStorageRef(path), url, name: file.name, createdAt: file.created_at, bytes: Number(file.metadata?.size ?? 0) };
    }));
    return NextResponse.json({ assets: assets.filter(Boolean), nextOffset: data.length === PAGE_SIZE ? offset + PAGE_SIZE : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "asset-library-unavailable" }, { status: 503 }); }
}

/** Read sizes without downloading the files or trusting client-supplied sizes. */
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (!body || typeof body !== "object" || !("refs" in body) || !Array.isArray(body.refs) || body.refs.length > 50) {
    return NextResponse.json({ error: "bad-target" }, { status: 400 });
  }
  const refs = body.refs.map(value => typeof value === "string" ? parseStorageRef(value) : null);
  if (refs.some(ref => !ref || ref.bucket !== STORAGE_BUCKET || !isOwnedPrivateAssetPath(ref.path, user.id))) {
    return NextResponse.json({ error: "forbidden_ref" }, { status: 403 });
  }
  try {
    const store = getSupabaseAdmin().storage.from(STORAGE_BUCKET);
    const assets = await Promise.all(refs.map(async ref => {
      if (!ref) throw new Error("invalid-ref");
      const { data, error } = await store.info(ref.path);
      const size = Number(data?.size);
      return { storageRef: toStorageRef(ref.path), bytes: !error && Number.isFinite(size) && size > 0 ? size : null };
    }));
    return NextResponse.json({ assets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "asset-metadata-unavailable" }, { status: 503 }); }
}

/** Only uploads listed in this library can be deleted through this endpoint. */
export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const ref = body && typeof body === "object" && "storageRef" in body && typeof body.storageRef === "string" ? parseStorageRef(body.storageRef) : null;
  if (!ref || ref.bucket !== STORAGE_BUCKET || !isOwnedPrivateAssetPath(ref.path, user.id) ||
      !ref.path.startsWith(`${user.id}/project-assets/`)) {
    return NextResponse.json({ error: "forbidden_ref" }, { status: 403 });
  }
  try {
    const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([ref.path]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "asset-delete-failed" }, { status: 503 }); }
}
