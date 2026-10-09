import { getAccessToken } from "@/lib/supabase/client";

/** Existing legacy controls use the same MFA/permission boundary as modern admin. */
export async function readAdminSettings(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token ?? ""}` }, cache: "no-store" });
  const body = await response.json();
  return response.ok ? { data: body.data, error: null } : { data: null, error: { message: body.error ?? "settings_unavailable" } };
}

export async function saveAdminSettings(patch: Record<string, unknown>): Promise<{ error: { message: string } | null }> {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/settings", { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  const body = await response.json();
  return { error: response.ok ? null : { message: body.error ?? "settings_save_failed" } };
}
