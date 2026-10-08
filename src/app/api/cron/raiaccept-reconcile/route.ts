import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/security/cronAuth";
import { readRaiAcceptConfig } from "@/lib/payments/raiaccept/config";
import { getRaiAcceptClient } from "@/lib/payments/raiaccept/client";
import { runRaiAcceptRecovery } from "@/lib/payments/raiaccept/recovery";
import { deliverRaiAcceptReceipts } from "@/lib/payments/raiaccept/receipts";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request) {
  if (process.env.RAIACCEPT_ENABLED!=="true" || process.env.RAIACCEPT_RECOVERY_ENABLED!=="true") return NextResponse.json({error:"not_configured"},{status:404});
  // Require a secret in every environment, including local/staging builds.
  if (!process.env.CRON_SECRET?.trim()) return NextResponse.json({error:"not_configured"},{status:503});
  if (authorizeCronRequest(req)!=="ok") return NextResponse.json({error:"unauthorized"},{status:401});
  try {
    const config=readRaiAcceptConfig();
    const report=await runRaiAcceptRecovery(config,getRaiAcceptClient());
    if (report.issues.length) console.error("raiaccept_recovery_attention",JSON.stringify(report));
    let receipts;try {receipts=await deliverRaiAcceptReceipts(config);} catch {console.error("raiaccept_receipts_unavailable");receipts={failed:true};}
    return NextResponse.json({...report,receipts},{headers:{"Cache-Control":"no-store"}});
  } catch {
    console.error("raiaccept_recovery_unavailable");
    return NextResponse.json({error:"temporarily_unavailable"},{status:503});
  }
}
