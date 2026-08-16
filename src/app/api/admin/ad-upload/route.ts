import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { supabaseServerConfigured, uploadGeneratedImage } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: upload an ad banner image and return its public URL.
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { dataUrl?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const dataUrl = body.dataUrl ?? "";
  const m = dataUrl.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "bad-image" }, { status: 400 });

  const url = await uploadGeneratedImage(auth.admin.userId, m[1]);
  if (!url) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  return NextResponse.json({ url });
}
