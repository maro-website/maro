import { getAccessToken } from "@/lib/supabase/client";

export async function adminAuthHeaders(json = false): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}
