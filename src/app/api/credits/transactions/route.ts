import { NextResponse } from "next/server";
import { fetchCreditTransactions } from "@/lib/credits/ledger";
import { getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ items: [] });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const items = await fetchCreditTransactions(user.id, 200);
  return NextResponse.json({ items });
}
