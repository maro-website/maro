import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getOrderForUser,serializeOrder } from "@/lib/payments/orders";
import { getRaiAcceptOrderState,publicRaiAcceptState } from "@/lib/payments/raiaccept/orderState";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orderId = new URL(req.url).searchParams.get("orderId")?.trim();
  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const state=order.provider==="raiaccept"?await getRaiAcceptOrderState(user.id,{orderId}):null;
    return NextResponse.json({order:{...serializeOrder(order),...(state?publicRaiAcceptState(state):{})}}, {headers:{"Cache-Control":"private, no-store"}});
  } catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
}
