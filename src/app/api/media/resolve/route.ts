import { NextResponse } from "next/server";
import { getUserFromToken, resolveAssetForClient, supabaseServerConfigured } from "@/lib/supabase/server";
import { parseStorageRef, STORAGE_BUCKET } from "@/lib/storage/assets";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7) : header;
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonProjectAsset);
  if (!parsed.ok) return parsed.response;
  const rawRefs = (parsed.body as { refs?: unknown }).refs;
  if (!Array.isArray(rawRefs) || rawRefs.length > 50) {
    return NextResponse.json({ error: "invalid_refs" }, { status: 400 });
  }

  const refs = [...new Set(rawRefs)].filter((value): value is string => typeof value === "string");
  if (refs.length !== rawRefs.length) return NextResponse.json({ error: "invalid_refs" }, { status: 400 });

  for (const value of refs) {
    const ref = parseStorageRef(value);
    if (!ref || ref.bucket !== STORAGE_BUCKET || ref.path.split("/")[0] !== user.id) {
      return NextResponse.json({ error: "forbidden_ref" }, { status: 403 });
    }
  }

  const entries = await Promise.all(refs.map(async (ref) => [ref, await resolveAssetForClient(ref)] as const));
  return NextResponse.json({ urls: Object.fromEntries(entries) });
}
