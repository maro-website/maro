import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { listEmailLogs } from "@/lib/email/cms";
import { emailAdminErrorResponse } from "@/lib/admin/emailApi";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const templateKey = url.searchParams.get("templateKey") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  try {
    const result = await listEmailLogs({ status, templateKey, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
