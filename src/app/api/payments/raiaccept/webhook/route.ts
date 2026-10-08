import { NextResponse } from "next/server";
import { readRaiAcceptConfig } from "@/lib/payments/raiaccept/config";
import { parseRaiAcceptNotification } from "@/lib/payments/raiaccept/verification";
import { createVerificationStore } from "@/lib/payments/raiaccept/recovery";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { clientIp,enforceRateLimit } from "@/lib/security/rateLimit";
export const runtime="nodejs";
export async function POST(req:Request) {
  if (process.env.RAIACCEPT_ENABLED!=="true") return NextResponse.json({error:"not_configured"},{status:404});
  const limit=await enforceRateLimit(req,"payments:raiaccept-webhook",clientIp(req),120,60,"strict");
  if (!limit.allowed) return NextResponse.json({error:"rate_limited"},{status:429,headers:{"Retry-After":String(limit.retryAfter)}});
  const parsed=await readJsonBody(req,REQUEST_LIMITS.jsonCreateOrder); if (!parsed.ok) return parsed.response;
  let config; try {config=readRaiAcceptConfig();} catch {return NextResponse.json({error:"not_configured"},{status:503});}
  let hint; try {hint=parseRaiAcceptNotification(parsed.body,config);} catch {return NextResponse.json({error:"invalid_notification"},{status:400});}
  try {
    // ACK only after durable storage. Bank fields never grant credits here.
    await createVerificationStore().enqueue(config,hint.providerOrderId,hint.merchantReference);
    return NextResponse.json({accepted:true},{status:202});
  } catch {return NextResponse.json({error:"temporarily_unavailable"},{status:503});}
}
