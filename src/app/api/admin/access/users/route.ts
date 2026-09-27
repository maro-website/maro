import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { findUserByEmail } from "@/lib/admin/accessOverview";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "users.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const email = new URL(req.url).searchParams.get("email")?.trim() ?? "";
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const user = await findUserByEmail(email);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    user: {
      ...user,
      isSelf: user.id === auth.admin.userId,
    },
  });
}
