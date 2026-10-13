import { createMcpHttpHandlers } from "@/lib/mcp/http";
import { getProductMcpResource } from "@/lib/mcp/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const { POST, GET, DELETE, OPTIONS } = createMcpHttpHandlers("brain", getProductMcpResource("brain"), true);
