import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppSettings, PricingConfig } from "./types";
import { DEFAULT_PRICING } from "./types";

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
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("app_settings")
      .select("master_prompt, pricing, tool_prompts")
      .eq("id", 1)
      .single();
    const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
    return {
      master_prompt: data?.master_prompt ?? "",
      tool_prompts: (data?.tool_prompts as Record<string, string>) ?? {},
      pricing: {
        types: { ...DEFAULT_PRICING.types, ...(pricing.types ?? {}) },
        speed: { ...DEFAULT_PRICING.speed, ...(pricing.speed ?? {}) },
        tools: { ...DEFAULT_PRICING.tools, ...(pricing.tools ?? {}) },
        editCost: pricing.editCost ?? DEFAULT_PRICING.editCost,
      },
    };
  } catch {
    return { master_prompt: "", tool_prompts: {}, pricing: DEFAULT_PRICING };
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

export async function getProfileCredits(userId: string): Promise<{ credits: number; is_admin: boolean; email: string } | null> {
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("credits, is_admin, email")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return {
    credits: (data.credits as number) ?? 0,
    is_admin: Boolean(data.is_admin),
    email: (data.email as string) ?? "",
  };
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
}): Promise<void> {
  try {
    await getSupabaseAdmin().from("generations").insert(entry);
  } catch {
    // logging is best-effort
  }
}
