import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";
import { AccountPolicyError, requireBrainAccess } from "@/lib/workspaces/accountPolicyServer";
import { readJsonBody } from "@/lib/security/requestLimits";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { BrandFetchError, normalizeBrandUrl } from "./network";
import { fetchBrand, fetchBrandLogo } from "./service";

// Production workspaces use text IDs (including ws_... bootstrap IDs), not only UUIDs.
const bodySchema = z.object({ workspaceId: z.string().trim().min(1).max(160), url: z.string().trim().min(1).max(2048) }).strict();
const headers = { "Cache-Control": "no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };
const response = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...headers, ...extra } });

export async function handleBrandFetch(req: Request, kind: "profile" | "logo") {
  try {
    if (!supabaseServerConfigured()) return response({ error: "unavailable" }, 503);
    const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? null;
    const user = await getUserFromToken(token);
    if (!user) return response({ error: "unauthorized" }, 401);
    const parsed = await readJsonBody(req, 4096);
    if (!parsed.ok) { Object.entries(headers).forEach(([key, value]) => parsed.response.headers.set(key, value)); return parsed.response; }
    const body = bodySchema.safeParse(parsed.body);
    if (!body.success) return response({ error: "invalid_request" }, 400);
    const url = normalizeBrandUrl(body.data.url).href;
    const { data: workspace, error } = await getSupabaseAdmin().from("workspaces").select("id").eq("id", body.data.workspaceId).eq("owner_id", user.id).maybeSingle();
    if (error) return response({ error: "unavailable" }, 503);
    if (!workspace) return response({ error: "workspace_not_found" }, 404);
    await requireBrainAccess(user.id, workspace.id);
    // Database-backed, account-wide limits also apply on cache hits and across replicas.
    for (const [window, limit] of [[3600, kind === "profile" ? 12 : 40], [86400, kind === "profile" ? 40 : 100]] as const) {
      const allowed = await checkRateLimit(`brain-fetch:${kind}:${window}`, user.id, limit, window, "strict");
      if (!allowed.allowed) return response({ error: "rate_limited", retry_after: allowed.retryAfter }, 429, { "Retry-After": String(allowed.retryAfter) });
    }
    return kind === "profile" ? response(await fetchBrand(url, `${user.id}:${workspace.id}`)) : response({ dataUrl: await fetchBrandLogo(url) });
  } catch (error) {
    if (error instanceof AccountPolicyError) return response({ error: error.message }, error.status);
    if (error instanceof BrandFetchError) return response({ error: error.message }, 422);
    return response({ error: "fetch_failed" }, 502);
  }
}
