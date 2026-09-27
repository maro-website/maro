import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { listEmailTemplates } from "@/lib/email/cms";
import { emailAdminErrorResponse } from "@/lib/admin/emailApi";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
