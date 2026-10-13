import { requireUser } from "@/lib/payments/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
/** Show product-specific consent without exposing other users' OAuth grants. */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const authorization = new URL(request.url).searchParams.get("authorization_id") ?? "";
  if (!authorization || authorization.length > 200) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc("maro_mcp_brain_authorization", { p_user: user.id, p_authorization: authorization });
  if (error) return Response.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  const product = data?.resource === "https://maro.al/api/mcp/brain" ? "brain"
    : ["https://maro.al/api/mcp", "https://maro.al/api/mcp/imazh"].includes(data?.resource) ? "imazh" : null;
  return Response.json({ product }, { headers: { "Cache-Control": "no-store" } });
}
