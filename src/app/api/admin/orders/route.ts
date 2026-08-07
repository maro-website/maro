import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { listAllOrders, serializeOrder } from "@/lib/payments/orders";
import { resolveOrderDisplayStatus } from "@/lib/payments/orderDisplay";

export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

async function requireAdmin(req: Request) {
  const user = await getUserFromToken(bearer(req));
  if (!user) return null;
  const { data: prof } = await getSupabaseAdmin()
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!prof?.is_admin) return null;
  return user;
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const orders = await listAllOrders();
  return NextResponse.json({
    orders: orders.map((o) => {
      const serialized = serializeOrder(o);
      return {
        ...serialized,
        userEmail: o.user_email,
        displayStatus: resolveOrderDisplayStatus(o.status, o.cancel_reason),
      };
    }),
  });
}
