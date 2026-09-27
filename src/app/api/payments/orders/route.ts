import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { listOrdersForUser, serializeOrder } from "@/lib/payments/orders";
import { resolveOrderDisplayStatus } from "@/lib/payments/orderDisplay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orders = await listOrdersForUser(user.id);
  return NextResponse.json({
    orders: orders.map((o) => {
      const serialized = serializeOrder(o);
      return {
        ...serialized,
        displayStatus: resolveOrderDisplayStatus(o.status, o.cancel_reason),
      };
    }),
  });
}
