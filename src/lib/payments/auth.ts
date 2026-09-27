import { getUserFromToken } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

export async function requireUser(req: Request): Promise<User | null> {
  return getUserFromToken(bearerToken(req));
}
