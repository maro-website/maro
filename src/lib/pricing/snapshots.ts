import "server-only";

import type { CommercialSnapshot } from "@/lib/commerce/types";
import { getAppSettings, getSupabaseAdmin } from "@/lib/supabase/server";

export async function recordOrderPricingSnapshot(input: {
  orderId: string;
  userId: string;
  itemId: string;
  promoCode?: string | null;
  commercialSnapshot?: CommercialSnapshot | null;
}): Promise<void> {
  try {
    const settings = await getAppSettings();
    await getSupabaseAdmin().from("pricing_snapshots").insert({
      order_id: input.orderId,
      user_id: input.userId,
      kind: "purchase",
      snapshot: {
        captured_at: new Date().toISOString(),
        item_id: input.itemId,
        promo_code: input.promoCode ?? null,
        generation_pricing: settings.pricing,
        list_price_centi_credit: 9,
        commercial: input.commercialSnapshot ?? null,
      },
    });
  } catch (err) {
    console.error("[pricing_snapshots] order insert failed:", err);
  }
}

export async function recordGenerationPricingSnapshot(input: {
  generationId?: string | null;
  jobId: string;
  userId: string;
  module: string;
  creditsCharged: number;
  model?: string;
  pricingBreakdown?: Record<string, unknown>;
}): Promise<void> {
  try {
    const settings = await getAppSettings();
    await getSupabaseAdmin().from("pricing_snapshots").insert({
      generation_id: input.generationId ?? null,
      job_id: input.jobId,
      user_id: input.userId,
      kind: "generation",
      snapshot: {
        captured_at: new Date().toISOString(),
        module: input.module,
        model: input.model ?? null,
        credits_charged: input.creditsCharged,
        pricing_config: settings.pricing,
        breakdown: input.pricingBreakdown ?? {},
      },
    });
  } catch (err) {
    console.error("[pricing_snapshots] generation insert failed:", err);
  }
}
