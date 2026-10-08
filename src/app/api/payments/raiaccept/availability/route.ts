import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { raiAcceptCheckoutEnabled,readRaiAcceptConfig } from "@/lib/payments/raiaccept/config";
export const dynamic="force-dynamic";
export async function GET(req:Request) {
  let enabled=false;
  try {
    const user=await requireUser(req); enabled=raiAcceptCheckoutEnabled(user?.id);
    if (enabled) readRaiAcceptConfig();
  } catch {enabled=false;}
  return NextResponse.json({enabled},{headers:{"Cache-Control":"no-store"}});
}
