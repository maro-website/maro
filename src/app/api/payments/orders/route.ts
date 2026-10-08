import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { listOrdersForUser, serializeOrder } from "@/lib/payments/orders";
import { resolveOrderDisplayStatus } from "@/lib/payments/orderDisplay";
import { listRaiAcceptSummaries } from "@/lib/payments/raiaccept/orderState";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orders = await listOrdersForUser(user.id);
  let states;try {states=await listRaiAcceptSummaries(orders.filter(order=>order.provider==="raiaccept").map(order=>order.id),user.id);}
  catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
  return NextResponse.json({
    orders: orders.map((o) => {
      const serialized = serializeOrder(o);
      return {
        ...serialized,
        ...(states.has(o.id)?{paymentState:states.get(o.id)!.paymentState,fulfillmentState:states.get(o.id)!.fulfillmentState,requiresReview:states.get(o.id)!.requiresReview}:{}),
        displayStatus: resolveOrderDisplayStatus(o.status, o.cancel_reason),
      };
    }),
  },{headers:{"Cache-Control":"private, no-store"}});
}
