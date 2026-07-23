import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppSettings, PricingConfig } from "./types";
import { DEFAULT_PRICING } from "./types";
import type { FortConfig } from "@/lib/fort/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseServerConfigured(): boolean {
  return Boolean(url && serviceKey);
}

// Admin client (service role) — bypasses RLS. NEVER expose to the browser.
let cachedAdmin: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!cachedAdmin) {
    cachedAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedAdmin;
}

// Resolve a Supabase user from a bearer access token (from the Authorization
// header). Returns null on any failure.
export async function getUserFromToken(token: string | null): Promise<User | null> {
  if (!token || !url || !anonKey) return null;
  try {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}

// Read the single app_settings row (master prompt + pricing) with safe fallbacks.
// Resilient to the tool_prompts column not existing yet (before migration 0003).
export async function getAppSettings(): Promise<AppSettings> {
  const admin = getSupabaseAdmin();
  const build = (data: Record<string, unknown> | null): AppSettings => {
    const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
    return {
      master_prompt: (data?.master_prompt as string) ?? "",
      tool_prompts: (data?.tool_prompts as Record<string, string>) ?? {},
      fort_config: (data?.fort_config as FortConfig) ?? {},
      pricing: {
        types: { ...DEFAULT_PRICING.types, ...(pricing.types ?? {}) },
        speed: { ...DEFAULT_PRICING.speed, ...(pricing.speed ?? {}) },
        tools: { ...DEFAULT_PRICING.tools, ...(pricing.tools ?? {}) },
        options: pricing.options ?? {},
        editCost: pricing.editCost ?? DEFAULT_PRICING.editCost,
        announcements: pricing.announcements ?? [],
      },
    };
  };

  try {
    const { data, error } = await admin
      .from("app_settings")
      .select("master_prompt, pricing, tool_prompts, fort_config")
      .eq("id", 1)
      .single();
    if (!error) return build(data);
  } catch {
    /* fall through to the legacy select below */
  }

  // Legacy fallback (tool_prompts / fort_config columns missing).
  try {
    const { data } = await admin
      .from("app_settings")
      .select("master_prompt, pricing")
      .eq("id", 1)
      .single();
    return build(data);
  } catch {
    return { master_prompt: "", tool_prompts: {}, fort_config: {}, pricing: DEFAULT_PRICING };
  }
}

// Upload a base64 PNG to the public "generations" bucket and return its public
// URL. Uses the service role (bypasses Storage RLS).
export async function uploadGeneratedImage(
  userId: string,
  b64: string
): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();
    const bytes = Buffer.from(b64, "base64");
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error } = await admin.storage
      .from("generations")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (error) return null;
    const { data } = admin.storage.from("generations").getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}

// Atomically spend credits via the SQL function. Returns the new balance, or -1
// if the user did not have enough credits.
export async function spendCredits(userId: string, amount: number): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc("spend_credits", {
    p_user: userId,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : -1;
}

// Refund credits (used when generation fails after deduction).
export async function refundCredits(userId: string, amount: number): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("profiles").select("credits").eq("id", userId).single();
  const current = (data?.credits as number) ?? 0;
  await admin.from("profiles").update({ credits: current + amount }).eq("id", userId);
}

export async function getProfileCredits(
  userId: string
): Promise<{ credits: number; is_admin: boolean; email: string; plan: string } | null> {
  const admin = getSupabaseAdmin();
  // Try with plan; fall back to the legacy select if the column is missing.
  let data: Record<string, unknown> | null = null;
  const withPlan = await admin
    .from("profiles")
    .select("credits, is_admin, email, plan")
    .eq("id", userId)
    .single();
  if (!withPlan.error) {
    data = withPlan.data as Record<string, unknown>;
  } else {
    const legacy = await admin
      .from("profiles")
      .select("credits, is_admin, email")
      .eq("id", userId)
      .single();
    data = legacy.data as Record<string, unknown> | null;
  }
  if (!data) return null;
  return {
    credits: (data.credits as number) ?? 0,
    is_admin: Boolean(data.is_admin),
    email: (data.email as string) ?? "",
    plan: (data.plan as string) ?? "free",
  };
}

// True when the user's subscription plan unlocks maroFort mode. Best-effort:
// returns false if the `plan` column does not exist yet (pre-0009).
export async function hasFort(userId: string): Promise<boolean> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();
    return (data?.plan as string) === "fort";
  } catch {
    return false;
  }
}

export async function logGeneration(entry: {
  user_id: string;
  user_email: string;
  prompt: string;
  final_prompt: string;
  model: string;
  credits_spent: number;
  website_type?: string;
  speed?: string;
  tool_id?: string;
  kind?: string;
  output_urls?: string[];
  selections?: Record<string, unknown>;
  fort?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getSupabaseAdmin().from("generations").insert(entry);
  } catch {
    // Retry without the newer columns (selections/fort) in case the 0009
    // migration has not been applied yet — logging is best-effort.
    try {
      const { selections: _s, fort: _f, ...rest } = entry;
      void _s;
      void _f;
      await getSupabaseAdmin().from("generations").insert(rest);
    } catch {
      /* give up */
    }
  }
}
