import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import {
  buildAccessOverviewPayload,
  listPrivilegedUsers,
  listRecentRoleChanges,
} from "@/lib/admin/accessOverview";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "users.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [privilegedUsers, recentRoleChanges] = await Promise.all([
    listPrivilegedUsers(),
    listRecentRoleChanges(),
  ]);

  return NextResponse.json({
    ...buildAccessOverviewPayload(auth.admin),
    privilegedUsers: privilegedUsers.map((u) => ({
      ...u,
      isSelf: u.id === auth.admin.userId,
    })),
    recentRoleChanges,
  });
}
