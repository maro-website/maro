import { NextResponse } from "next/server";
import { resolveOrderItem } from "@/lib/payments/orders";
import { requireUser } from "@/lib/payments/auth";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const itemId = new URL(req.url).searchParams.get("item")?.trim() ?? "";
  if (!itemId) return NextResponse.json({ error: "invalid_item" }, { status: 400 });

  const resolved = await resolveOrderItem(user.id, itemId);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 403 });
  }

  const { item, commercialSnapshot, orderKind } = resolved;
  return NextResponse.json({
    itemId: item!.itemId,
    label: item!.label,
    credits: item!.credits,
    priceCents: item!.priceCents,
    priceEur: item!.priceCents / 100,
    currency: item!.currency,
    orderKind,
    commercialSnapshot,
  });
}
