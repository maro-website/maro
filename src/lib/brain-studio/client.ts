"use client";
import { getAccessToken } from "@/lib/supabase/client";
import { rateLimitedFetch } from "@/lib/client/rateLimit";
import type { BrainMemory, MemoryMetadata } from "./memories";

const messages: Record<string, string> = {
  unauthorized: "Hyr përsëri në llogari.", not_found: "Memorjet ende nuk janë të disponueshme për këtë llogari.",
  memory_conflict: "Kjo memorje ndryshoi në një vend tjetër. Rifreskoje listën; teksti yt mbetet në formular.",
  brain_refresh_required: "Profili u rivendos. Rifresko faqen para se të ruash.",
  brain_plan_required: "Memorjet kërkojnë një plan aktiv me maroBrain.",
  memory_limit: "U arrit limiti i historisë së memorjeve për këtë workspace.",
  memory_too_long: "Memorja është tepër e gjatë bashkë me titullin dhe opsionet. Shkurtoje pak përmbajtjen.",
  rate_limited: "Shumë ndryshime brenda një ore. Provo më vonë.",
};
export async function requestMemories(workspaceId: string, input?: { key: string; content: string; metadata: MemoryMetadata; expectedRevision: number; resetAt: string | null }, signal?: AbortSignal): Promise<BrainMemory[]> {
  const token = await getAccessToken(); if (!token) throw new Error(messages.unauthorized);
  const controller = new AbortController();
  const abort = () => controller.abort(); signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 25_000);
  try {
    const response = await rateLimitedFetch(`/api/brain/memories${input ? "" : `?workspaceId=${encodeURIComponent(workspaceId)}`}`, { method: input ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(input ? { "Content-Type": "application/json" } : {}) }, ...(input ? { body: JSON.stringify({ workspaceId, ...input }) } : {}), cache: "no-store", signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(messages[data.error] ?? "Memorjet nuk u ruajtën ose ngarkuan. Provo përsëri.");
    return data.memories;
  } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
}
