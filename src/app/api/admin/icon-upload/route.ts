import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { supabaseServerConfigured, uploadAdminSvg } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { validateSvgUpload } from "@/lib/security/uploadValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: upload a sanitized SVG icon for a tool option and return its public URL. */
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAdminUpload);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { dataUrl?: string; key?: string; variant?: string };

  const key = (body.key ?? "").trim();
  const variant = body.variant === "dark" ? "dark" : "light";
  if (!key) return NextResponse.json({ error: "bad-key" }, { status: 400 });

  const validated = validateSvgUpload({
    dataUrl: body.dataUrl ?? "",
    slug: `${key}-${variant}-${auth.admin.userId}`,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 });
  }

  const url = await uploadAdminSvg(auth.admin.userId, validated.bytes, validated.storageKey);
  if (!url) return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  return NextResponse.json({ url, variant });
}
