import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/supabase/types";
import type { FortConfig } from "@/lib/fort/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

/** Strip secret prompt layer content from fort config for client consumption. */
function sanitizeFortConfig(fc: FortConfig): FortConfig {
  const copy = JSON.parse(JSON.stringify(fc)) as FortConfig;
  if (copy.promptLayers) {
    for (const layer of copy.promptLayers) {
      if ("content" in layer) delete (layer as { content?: string }).content;
    }
  }
  return copy;
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({
      pricing: DEFAULT_PRICING,
      fort_config: {},
      tool_option_icons: {},
    });
  }

  const user = await getUserFromToken(bearer(req));
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("app_settings")
      .select("pricing, fort_config, tool_option_icons")
      .eq("id", 1)
      .single();
    if (error) throw error;
    const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
    const fort_config = sanitizeFortConfig((data?.fort_config as FortConfig) ?? {});
    const tool_option_icons = (data?.tool_option_icons as Record<string, unknown>) ?? {};
    return NextResponse.json({ pricing, fort_config, tool_option_icons });
  } catch {
    return NextResponse.json({ pricing: DEFAULT_PRICING, fort_config: {}, tool_option_icons: {} });
  }
}
