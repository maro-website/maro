"use client";
import { getAccessToken } from "@/lib/supabase/client";
import { rateLimitedFetch } from "@/lib/client/rateLimit";
import type { BrainSourceFolder, WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";
import { normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import type { BrainClearSection, LibraryOperation } from "./operations";

const messages: Record<string, string> = { brain_refresh_required: "maroBrain ndryshoi. Rifresko faqen para se të vazhdosh.", brand_conflict: "Profili ndryshoi në një vend tjetër. Rifresko faqen dhe kontrolloje përsëri.", source_conflict: "Lista e burimeve ndryshoi. Rifreskoje para se të vazhdosh.", folder_not_found: "Dosja nuk ekziston më. Rifresko listën.", brain_plan_required: "Të duhet një plan aktiv me maroBrain.", source_limit: "Ky workspace ka arritur 2,000 burime.", rate_limited: "Shumë veprime. Provo përsëri më vonë.", unauthorized: "Hyr përsëri në llogari." };
export async function studioRequest<T>(path: "library" | "clear", input: unknown, workspaceId: string, signal?: AbortSignal): Promise<T> {
  const token = await getAccessToken(); if (!token) throw Error(messages.unauthorized);
  const response = await rateLimitedFetch(`/api/brain/${path}${input ? "" : `?workspaceId=${encodeURIComponent(workspaceId)}`}`, { method: input ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(input ? { "Content-Type": "application/json" } : {}) }, ...(input ? { body: JSON.stringify(input) } : {}), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000), cache: "no-store" });
  const result = await response.json(); if (!response.ok) throw Error(messages[result.error] || "Veprimi nuk përfundoi. Provo përsëri."); return result;
}
export const requestLibrary = (workspaceId: string, resetAt: string | null, operation?: LibraryOperation, signal?: AbortSignal) => studioRequest<{ folders: BrainSourceFolder[]; cleanupPending: boolean }>("library", operation ? { workspaceId, resetAt, operation } : undefined, workspaceId, signal);
export function persistedStudioProfile(profile: WorkspaceBrainProfile) {
  return normalizeBrainProfile({ ...profile, brand: { ...profile.brand, logoUrl: profile.brand.logoStorageRef ?? profile.brand.logoUrl } });
}
export const clearStudio = (workspaceId: string, resetAt: string | null, section: BrainClearSection, profile: WorkspaceBrainProfile, sourceIds: string[]) => studioRequest<{ ok: true; cleanupPending: boolean }>("clear", { workspaceId, resetAt, section, expected: persistedStudioProfile(profile), sourceIds }, workspaceId);
