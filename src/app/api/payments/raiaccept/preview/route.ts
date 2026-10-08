import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { resolveOrderItem } from "@/lib/payments/orders";
import { raiAcceptCheckoutEnabled,readRaiAcceptConfig } from "@/lib/payments/raiaccept/config";
export const dynamic="force-dynamic";
export async function GET(req:Request) {
  const user=await requireUser(req); if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  if (!raiAcceptCheckoutEnabled(user.id)) return NextResponse.json({error:"purchases_unavailable"},{status:404});
  try {
    readRaiAcceptConfig(); const itemId=new URL(req.url).searchParams.get("item")??"";
    const resolved=await resolveOrderItem(user.id,itemId);
    if (!resolved.ok || !resolved.item) return NextResponse.json({error:resolved.ok?"invalid_item":resolved.error},{status:409});
    return NextResponse.json({item:{id:itemId,label:resolved.item.label,amountCents:resolved.item.priceCents,currency:resolved.item.currency,
      credits:resolved.item.credits,orderKind:resolved.orderKind,durationDays:resolved.commercialSnapshot.duration_days??null}},
      {headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
}
