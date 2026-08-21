import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { FortConfig } from "@/lib/fort/types";
import type { AppSettings, PricingConfig } from "./types";
import { DEFAULT_PRICING } from "./types";
import type { ToolOptionIcons } from "@/lib/tools/optionIcons";
import type { WorkspaceBrand } from "@/lib/workspaces/types";
import { normalizeWorkspaceBrand } from "@/lib/workspaces/brand";
import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import { normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import {
  refundCredits as refundCreditsLedger,
  refundCreditsAtomic,
  releaseCreditReserve,
} from "@/lib/credits/ledger";
import {
  getPublicStorageUrl,
  isPublicAssetPath,
  PUBLIC_STORAGE_BUCKET,
  STORAGE_BUCKET,
  toStorageRef,
} from "@/lib/storage/assets";

export {
  resolveAssetForClient,
  resolveAssetListForClient,
  publishStoredUrlToExplore,
} from "@/lib/storage/assets";

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
      tool_option_icons: (data?.tool_option_icons as ToolOptionIcons) ?? {},
      fort_config: (data?.fort_config as FortConfig) ?? {},
      pricing: {
        types: { ...DEFAULT_PRICING.types, ...(pricing.types ?? {}) },
        speed: { ...DEFAULT_PRICING.speed, ...(pricing.speed ?? {}) },
        tools: { ...DEFAULT_PRICING.tools, ...(pricing.tools ?? {}) },
        options: pricing.options ?? {},
        editCost: pricing.editCost ?? DEFAULT_PRICING.editCost,
        announcements: pricing.announcements ?? [],
        promptRevealCost: pricing.promptRevealCost,
        chatCost: pricing.chatCost,
      },
    };
  };

  try {
    const { data, error } = await admin
      .from("app_settings")
      .select("master_prompt, pricing, tool_prompts, fort_config, tool_option_icons")
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
    return { master_prompt: "", tool_prompts: {}, tool_option_icons: {}, fort_config: {}, pricing: DEFAULT_PRICING };
  }
}

// Upload an admin SVG asset (public admin-icons prefix).
export async function uploadAdminSvg(
  userId: string,
  svgBytes: Buffer,
  storageKey: string
): Promise<string | null> {
  return uploadStorageObject(storageKey, svgBytes, "image/svg+xml");
}

// Upload validated raster bytes. Public-prefix paths use the dedicated public
// bucket; private generated assets remain in the private generations bucket.
export async function uploadValidatedImage(
  bytes: Buffer,
  storageKey: string,
  contentType: string
): Promise<string | null> {
  return uploadStorageObject(storageKey, bytes, contentType);
}

async function uploadStorageObject(
  storageKey: string,
  bytes: Buffer,
  contentType: string
): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();
    const path = storageKey.replace(/^\/+/, "");
    const bucket = isPublicAssetPath(path) ? PUBLIC_STORAGE_BUCKET : STORAGE_BUCKET;
    const { error } = await admin.storage
      .from(bucket)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) return null;
    if (isPublicAssetPath(path)) {
      return (await getPublicStorageUrl(path, PUBLIC_STORAGE_BUCKET)) ?? null;
    }
    return toStorageRef(path);
  } catch {
    return null;
  }
}

/** Best-effort byte usage for a flat user-owned storage prefix. */
export async function storagePrefixUsageBytes(prefix: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const safePrefix = prefix.replace(/^\/+|\/+$/g, "");
  const bucket = isPublicAssetPath(safePrefix) ? PUBLIC_STORAGE_BUCKET : STORAGE_BUCKET;
  let offset = 0;
  let total = 0;

  while (offset < 10_000) {
    const { data, error } = await admin.storage.from(bucket).list(safePrefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) throw new Error("storage-usage-unavailable");
    for (const item of data) {
      const size = (item.metadata as { size?: unknown } | null)?.size;
      if (typeof size === "number" && Number.isFinite(size)) total += size;
    }
    if (data.length < 1000) break;
    offset += data.length;
  }

  return total;
}

/** Resolve a stored ref/legacy URL to a client-usable URL (signed when private). */
export async function resolveStoredAssetUrl(stored: string): Promise<string> {
  const { resolveAssetForClient } = await import("@/lib/storage/assets");
  return resolveAssetForClient(stored);
}

// Upload a base64 PNG to private user storage; returns a storage ref for DB persistence.
export async function uploadGeneratedImage(
  userId: string,
  b64: string
): Promise<string | null> {
  const { validateProviderImageBytes } = await import("@/lib/security/uploadValidation");
  const validated = validateProviderImageBytes(b64);
  if (!validated.ok) return null;
  const storageKey = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  return uploadValidatedImage(validated.bytes, storageKey, "image/png");
}

// Upload a base64 mp3 to private user storage; returns a storage ref.
export async function uploadGeneratedAudio(
  userId: string,
  b64: string
): Promise<string | null> {
  const { validateProviderAudioBytes } = await import("@/lib/security/uploadValidation");
  const validated = validateProviderAudioBytes(b64);
  if (!validated.ok) return null;
  const storageKey = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
  return uploadStorageObject(storageKey, validated.bytes, "audio/mpeg");
}

export async function uploadWebThumbnail(userId: string, generationId: string, bytes: Buffer): Promise<string | null> {
  const path = `${userId}/web-thumbnails/${generationId}.jpg`;
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
    cacheControl: "31536000",
  });
  return error ? null : toStorageRef(path, STORAGE_BUCKET);
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

// Refund credits via atomic ledger RPCs.
export async function refundCredits(
  userId: string,
  amount: number,
  jobId?: string
): Promise<void> {
  await refundCreditsLedger(userId, amount, jobId);
}

export { refundCreditsAtomic, releaseCreditReserve };

export interface ProfileCredits {
  credits: number;
  credits_reserved: number;
  is_admin: boolean;
  access_role?: string | null;
  email: string;
  plan: string;
  generation_paused?: boolean;
  created_at?: string;
}

function readFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function mapProfileCreditsRow(row: Record<string, unknown>): ProfileCredits {
  return {
    credits: readFiniteNumber(row.credits),
    credits_reserved: readFiniteNumber(row.credits_reserved),
    is_admin: Boolean(row.is_admin),
    access_role:
      row.access_role === null || typeof row.access_role === "string" ? row.access_role : null,
    email: typeof row.email === "string" ? row.email : "",
    plan: typeof row.plan === "string" ? row.plan : "free",
    generation_paused: Boolean(row.generation_paused),
    created_at: readOptionalString(row.created_at),
  };
}

export async function getProfileCredits(userId: string): Promise<ProfileCredits | null> {
  const admin = getSupabaseAdmin();
  let row: Record<string, unknown> | null = null;
  const withPlan = await admin
    .from("profiles")
    .select(
      "credits, credits_reserved, is_admin, access_role, email, plan, generation_paused, created_at"
    )
    .eq("id", userId)
    .single();
  if (!withPlan.error && withPlan.data) {
    row = withPlan.data as Record<string, unknown>;
  } else {
    const legacy = await admin
      .from("profiles")
      .select("credits, credits_reserved, is_admin, email, plan, created_at")
      .eq("id", userId)
      .single();
    row = legacy.data ? (legacy.data as Record<string, unknown>) : null;
  }
  if (!row) return null;
  return mapProfileCreditsRow(row);
}

// True when the user's subscription plan unlocks maroFort mode. Best-effort:
// returns false if the `plan` column does not exist yet (pre-0009).
export async function hasFort(userId: string): Promise<boolean> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("profiles")
      .select("plan, fort_until")
      .eq("id", userId)
      .single();
    if ((data?.plan as string) !== "fort") return false;
    const until = data?.fort_until as string | null;
    if (until && new Date(until) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

// maro Prompts — fetch a curated prompt's hidden template by id (service role).
// Returns null if missing/inactive. The `full_prompt` NEVER reaches the client
// except through the paid reveal endpoint.
export async function getPromptTemplate(
  id: string
): Promise<{ full_prompt: string; target_tool: string } | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("maro_prompts")
      .select("full_prompt, target_tool, active")
      .eq("id", id)
      .single();
    if (error || !data || data.active === false) return null;
    return {
      full_prompt: (data.full_prompt as string) ?? "",
      target_tool: (data.target_tool as string) ?? "",
    };
  } catch {
    return null;
  }
}

// Best-effort: increment a prompt's use counter when it is attached to a
// generation (+maro). Never throws.
export async function incrementPromptUse(id: string): Promise<void> {
  try {
    await getSupabaseAdmin().rpc("bump_prompt_use", { p_prompt: id });
  } catch {
    /* best-effort */
  }
}

export async function getActiveWorkspaceId(userId: string): Promise<string | null> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("profiles")
      .select("active_workspace_id")
      .eq("id", userId)
      .maybeSingle();
    return (data?.active_workspace_id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Resolve workspace for a generation: validate client id or fall back to active. */
export async function resolveWorkspaceId(
  userId: string,
  requested?: string | null
): Promise<string | null> {
  if (requested?.trim()) {
    try {
      const { data } = await getSupabaseAdmin()
        .from("workspaces")
        .select("id")
        .eq("id", requested.trim())
        .eq("owner_id", userId)
        .maybeSingle();
      if (data?.id) return data.id as string;
    } catch {
      /* fall through */
    }
  }
  return getActiveWorkspaceId(userId);
}

export async function getWorkspaceBrand(
  userId: string,
  workspaceId: string
): Promise<WorkspaceBrand | null> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("workspaces")
      .select(
        "brand_name, brand_logo_url, brand_primary_color, brand_secondary_color, brand_background_color, brand_text_color"
      )
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!data) return null;
    return normalizeWorkspaceBrand({
      name: (data.brand_name as string | undefined) ?? undefined,
      logoUrl: (data.brand_logo_url as string | undefined) ?? null,
      primaryColor: (data.brand_primary_color as string | undefined) ?? undefined,
      secondaryColor: (data.brand_secondary_color as string | undefined) ?? undefined,
      backgroundColor: (data.brand_background_color as string | undefined) ?? undefined,
      textColor: (data.brand_text_color as string | undefined) ?? undefined,
    });
  } catch {
    return null;
  }
}

export async function getWorkspaceBrainProfile(
  userId: string,
  workspaceId: string
): Promise<WorkspaceBrainProfile | null> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("workspaces")
      .select("brain_profile, brand_name, brand_logo_url")
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!data) return null;
    const profile = normalizeBrainProfile(
      (data.brain_profile as WorkspaceBrainProfile | null) ?? null
    );
    if (!profile.brand.name && data.brand_name) profile.brand.name = data.brand_name as string;
    if (!profile.brand.logoUrl && data.brand_logo_url) {
      profile.brand.logoUrl = data.brand_logo_url as string;
    }
    return profile;
  } catch {
    return null;
  }
}

export async function getWorkspaceSources(
  userId: string,
  workspaceId: string
): Promise<WorkspaceSource[]> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("workspace_sources")
      .select("id, workspace_id, name, keywords, file_url, mime_type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id as string,
      workspaceId: r.workspace_id as string,
      name: r.name as string,
      keywords: (r.keywords as string) ?? "",
      fileUrl: r.file_url as string,
      mimeType: (r.mime_type as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
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
  workspace_id?: string;
}): Promise<string | null> {
  try {
    const workspace_id =
      entry.workspace_id ?? (await getActiveWorkspaceId(entry.user_id)) ?? undefined;
    const { data } = await getSupabaseAdmin()
      .from("generations")
      .insert({ ...entry, workspace_id })
      .select("id")
      .single();
    return (data?.id as string) ?? null;
  } catch {
    // Retry without the newer columns (selections/fort/workspace) in case a
    // migration has not been applied yet — logging is best-effort.
    try {
      const { selections: _s, fort: _f, workspace_id: _w, ...rest } = entry;
      void _s;
      void _f;
      void _w;
      const { data } = await getSupabaseAdmin()
        .from("generations")
        .insert(rest)
        .select("id")
        .single();
      return (data?.id as string) ?? null;
    } catch {
      return null;
    }
  }
}
