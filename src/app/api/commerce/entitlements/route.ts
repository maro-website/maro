import { NextResponse } from "next/server";
import { resolveEntitlements } from "@/lib/commerce/entitlements";
import { getUpgradeQuote } from "@/lib/commerce/memberships";
import { requireUser } from "@/lib/payments/auth";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [entitlements, upgradeQuote] = await Promise.all([
    resolveEntitlements(user.id),
    getUpgradeQuote(user.id),
  ]);

  return NextResponse.json({
    entitlements,
    upgradeQuote,
  });
}
