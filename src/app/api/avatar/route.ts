import { NextResponse } from "next/server";
import {
  getUserFromToken,
  supabaseServerConfigured,
  uploadGeneratedImage,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

// Authenticated avatar upload. Stores the image in Supabase Storage and returns
// its public URL; the client then saves it to the user's auth metadata.
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { dataUrl?: string };
  try {
    body = (await req.json()) as { dataUrl?: string };
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const m = (body.dataUrl ?? "").match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "bad-image" }, { status: 400 });

  const url = await uploadGeneratedImage(user.id, m[1]);
  if (!url) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  return NextResponse.json({ url });
}
