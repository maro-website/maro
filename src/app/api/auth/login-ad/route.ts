import { NextResponse } from "next/server";
import { selectPublicLoginAd } from "@/lib/loginAds/server";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ ad: null }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const ad = await selectPublicLoginAd();
    return NextResponse.json(
      { ad },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json(
      { ad: null },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
