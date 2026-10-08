import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getOrderForUser } from "@/lib/payments/orders";
import { buildInvoiceHtml } from "@/lib/payments/invoiceHtml";
import { getRaiAcceptOrderState } from "@/lib/payments/raiaccept/orderState";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orderId = new URL(req.url).searchParams.get("orderId")?.trim();
  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.provider === "paddle") return NextResponse.json({ error: "use_paddle_portal" }, { status: 409 });

  let paymentState:string|undefined;
  if (order.provider==="raiaccept") {
    try {
      const state=await getRaiAcceptOrderState(user.id,{orderId}); paymentState=state?.payment_state;
      if (!paymentState||!["paid","partially_refunded","fully_refunded"].includes(paymentState)) return NextResponse.json({error:"payment_not_confirmed"},{status:409});
    } catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
  }
  const html = buildInvoiceHtml(order,paymentState);
  const filename = `fatura-${orderId.slice(0, 8)}.html`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":"private, no-store",
      "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options":"nosniff",
    },
  });
}
