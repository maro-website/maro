import { NextResponse } from "next/server";
import { runPlanRenewalReminders } from "@/lib/commerce/notifications";
import { authorizeCronRequest } from "@/lib/security/cronAuth";

export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (auth === "misconfigured") {
    return NextResponse.json({ error: "cron_misconfigured" }, { status: 503 });
  }
  if (auth === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runPlanRenewalReminders();
  return NextResponse.json({ ok: true, ...result });
}
