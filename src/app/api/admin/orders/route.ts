import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { listAllOrders, serializeOrder } from "@/lib/payments/orders";
import { listRaiAcceptSummaries } from "@/lib/payments/raiaccept/orderState";
import { resolveOrderDisplayStatus } from "@/lib/payments/orderDisplay";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "payments.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const orders = await listAllOrders();
  let states;try {states=await listRaiAcceptSummaries(orders.filter(order=>order.provider==="raiaccept").map(order=>order.id));}
  catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
  return NextResponse.json({
    orders: orders.map((o) => {
      const serialized = serializeOrder(o);
      return {
        ...serialized,
        ...(states.get(o.id)??{}),
        userEmail: o.user_email,
        promoCode: o.promo_code ?? null,
        displayStatus: resolveOrderDisplayStatus(o.status, o.cancel_reason),
      };
    }),
  });
}
