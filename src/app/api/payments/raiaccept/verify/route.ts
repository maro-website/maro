import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { readRaiAcceptConfig } from "@/lib/payments/raiaccept/config";
import { getRaiAcceptClient } from "@/lib/payments/raiaccept/client";
import { createVerificationStore,runRaiAcceptRecovery } from "@/lib/payments/raiaccept/recovery";
import { getRaiAcceptOrderState } from "@/lib/payments/raiaccept/orderState";
import { readJsonBody,REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { enforceRateLimit } from "@/lib/security/rateLimit";
export const runtime="nodejs";
export async function POST(req:Request) {
  const user=await requireUser(req); if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  const limit=await enforceRateLimit(req,"payments:raiaccept-verify",user.id,6,60,"strict");
  if (!limit.allowed) return NextResponse.json({error:"rate_limited"},{status:429});
  const parsed=await readJsonBody(req,REQUEST_LIMITS.jsonCreateOrder);if (!parsed.ok) return parsed.response;
  const orderId=(parsed.body as {orderId?:unknown}|null)?.orderId;
  if (typeof orderId!=="string"||!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({error:"invalid_order"},{status:400});
  try {
    const state=await getRaiAcceptOrderState(user.id,{orderId});if (!state) return NextResponse.json({error:"not_found"},{status:404});
    const config=readRaiAcceptConfig();
    if (state.environment!==config.environment||state.merchant_account_id!==config.merchantAccountId) return NextResponse.json({error:"not_found"},{status:404});
    const store=createVerificationStore();
    if (state.provider_order_id) await store.enqueue(config,state.provider_order_id,state.merchant_reference);
    await runRaiAcceptRecovery(config,getRaiAcceptClient(),store,orderId);
    return NextResponse.json({accepted:true},{headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
}
