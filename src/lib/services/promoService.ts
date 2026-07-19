"use client";

import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";

export interface PromoInfo {
  code: string;
  slug: string | null;
  discount: number;
  creatorId: string | null;
}

// Validate a promo code (case-insensitive). Returns null if not found/inactive.
export async function validatePromo(raw: string): Promise<PromoInfo | null> {
  const code = raw.trim();
  if (!code || !supabaseConfigured) return null;
  try {
    const { data, error } = await getSupabaseBrowser()
      .from("promo_codes")
      .select("code, slug, discount_percent, creator_id, active")
      .ilike("code", code)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      code: data.code as string,
      slug: (data.slug as string) ?? null,
      discount: (data.discount_percent as number) ?? 0,
      creatorId: (data.creator_id as string) ?? null,
    };
  } catch {
    return null;
  }
}

// Look up a promo by its referral-link slug (maro.al/r/<slug>).
export async function lookupPromoBySlug(raw: string): Promise<PromoInfo | null> {
  const slug = raw.trim();
  if (!slug || !supabaseConfigured) return null;
  try {
    const { data, error } = await getSupabaseBrowser()
      .from("promo_codes")
      .select("code, slug, discount_percent, creator_id, active")
      .ilike("slug", slug)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      code: data.code as string,
      slug: (data.slug as string) ?? null,
      discount: (data.discount_percent as number) ?? 0,
      creatorId: (data.creator_id as string) ?? null,
    };
  } catch {
    return null;
  }
}

// Record a referral usage event (best-effort).
export async function trackPromo(code: string, kind: "link" | "code"): Promise<void> {
  if (!code || !supabaseConfigured) return;
  try {
    let userId: string | null = null;
    const { data } = await getSupabaseBrowser().auth.getUser();
    userId = data.user?.id ?? null;
    await getSupabaseBrowser().from("promo_events").insert({ code, kind, user_id: userId });
  } catch {
    /* best-effort */
  }
}

export interface CreatorApplication {
  name: string;
  email: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
}

export async function submitCreatorApplication(
  app: CreatorApplication
): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: "Supabase nuk është konfiguruar." };
  try {
    const { error } = await getSupabaseBrowser().from("creator_applications").insert({
      name: app.name.trim(),
      email: app.email.trim(),
      instagram: app.instagram?.trim() || null,
      tiktok: app.tiktok?.trim() || null,
      facebook: app.facebook?.trim() || null,
      youtube: app.youtube?.trim() || null,
      website: app.website?.trim() || null,
    });
    return { error: error?.message ?? null };
  } catch {
    return { error: "Dërgimi dështoi. Provo përsëri." };
  }
}
