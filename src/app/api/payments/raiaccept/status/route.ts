import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getOrderForUser,serializeOrder } from "@/lib/payments/orders";
import { getRaiAcceptOrderState,publicRaiAcceptState } from "@/lib/payments/raiaccept/orderState";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(req:Request) {
  const user=await requireUser(req); if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  const params=new URL(req.url).searchParams; const orderId=params.get("orderId");const requestKey=params.get("requestKey");
  if ((!orderId&&!requestKey) || !UUID.test(orderId??requestKey??"")) return NextResponse.json({error:"invalid_order"},{status:400});
  try {
    const state=await getRaiAcceptOrderState(user.id,orderId?{orderId}:{requestKey:requestKey!});
    if (!state) return NextResponse.json({error:"not_found"},{status:404});
    const order=await getOrderForUser(state.order_id,user.id); if (!order||order.provider!=="raiaccept") return NextResponse.json({error:"not_found"},{status:404});
    return NextResponse.json({order:serializeOrder(order),...publicRaiAcceptState(state)},{headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
}
