import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getOrderForUser } from "@/lib/payments/orders";
import { buildInvoiceHtml } from "@/lib/payments/invoiceHtml";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orderId = new URL(req.url).searchParams.get("orderId")?.trim();
  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const html = buildInvoiceHtml(order);
  const filename = `fatura-${orderId.slice(0, 8)}.html`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
