import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { isOwnedPrivateAssetPath, signStoragePath, STORAGE_BUCKET, toStorageRef } from "@/lib/storage/assets";

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
