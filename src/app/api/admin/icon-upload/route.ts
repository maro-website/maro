import { NextResponse } from "next/server";
import {
  getProfileCredits,
  getUserFromToken,
  supabaseServerConfigured,
  uploadAdminSvg,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

function decodeSvg(dataUrl: string): string | null {
  const b64 = dataUrl.match(/^data:image\/svg\+xml;base64,(.+)$/i);
  if (b64) {
    try {
      return Buffer.from(b64[1], "base64").toString("utf-8");
    } catch {
      return null;
    }
  }
  const uri = dataUrl.match(/^data:image\/svg\+xml,(.+)$/i);
  if (uri) {
    try {
      return decodeURIComponent(uri[1]);
    } catch {
      return null;
    }
  }
  if (dataUrl.trim().startsWith("<svg")) return dataUrl;
  return null;
}

/** Admin-only: upload an SVG icon for a tool option and return its public URL. */
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getProfileCredits(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { dataUrl?: string; key?: string; variant?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const svg = decodeSvg(body.dataUrl ?? "");
  const key = (body.key ?? "").trim();
  const variant = body.variant === "dark" ? "dark" : "light";
  if (!svg || !key) return NextResponse.json({ error: "bad-svg" }, { status: 400 });
  if (!svg.includes("<svg")) return NextResponse.json({ error: "bad-svg" }, { status: 400 });

  const url = await uploadAdminSvg(user.id, svg, `${key}-${variant}`);
  if (!url) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  return NextResponse.json({ url, variant });
}
