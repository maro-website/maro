"use client";

import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";

export interface ReportInput {
  toolId: string;
  kind: string;
  targetId?: string;
  targetUrl?: string;
  prompt?: string;
  message: string;
  creditsSpent?: number;
}

// Submit a report for the user's own generation. RLS allows insert only when
// user_id == auth.uid(). The email is taken from the session automatically.
export async function submitReport(input: ReportInput): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: "Supabase nuk është konfiguruar." };
  try {
    const sb = getSupabaseBrowser();
    const { data } = await sb.auth.getUser();
    const user = data.user;
    if (!user) return { error: "Hyr për të raportuar." };
    const { error } = await sb.from("reports").insert({
      user_id: user.id,
      user_email: user.email ?? "",
      tool_id: input.toolId,
      kind: input.kind,
      target_id: input.targetId ?? null,
      target_url: input.targetUrl ?? null,
      prompt: input.prompt ?? null,
      message: input.message,
      credits_spent: input.creditsSpent ?? 0,
      status: "open",
    });
    return { error: error?.message ?? null };
  } catch {
    return { error: "Dërgimi dështoi. Provo përsëri." };
  }
}
