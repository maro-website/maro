import { getMaroProtectedResourceMetadata, getProductMcpResource } from "@/lib/mcp/config";
export const dynamic = "force-dynamic";
export function GET() { return Response.json(getMaroProtectedResourceMetadata(getProductMcpResource("brain")), { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }); }
