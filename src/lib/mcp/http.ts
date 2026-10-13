import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyMaroMcpRequest } from "./auth";
import { getMaroMcpChallenge, getMaroMcpResource, type MaroMcpProduct } from "./config";
import { createMaroMcpServer } from "./server";
import { createMaroBrainMcpServer } from "./brainServer";
import { readJsonBody } from "@/lib/security/requestLimits";

const MAX_BODY = 64 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Protocol-Version, MCP-Session-Id",
};

export function createMcpHttpHandlers(product: MaroMcpProduct = "imazh", resource = getMaroMcpResource(), standalone = false) {
  const challenge = (missing: boolean) => getMaroMcpChallenge({ resource, error: "invalid_token", description: missing ? "Connect your Maro account to continue." : "Reconnect your Maro account to continue." });
  async function handle(request: Request, body?: unknown) {
    const auth = await verifyMaroMcpRequest(request, resource);
    const server = product === "brain" ? createMaroBrainMcpServer({ auth, request, resource }) : createMaroMcpServer({ auth, request, resource, standalone });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, keepAliveMs: 15_000 });
    await server.connect(transport);
    const response = await transport.handleRequest(request, {
      ...(body === undefined ? {} : { parsedBody: body }),
      ...(auth.ok ? { authInfo: { token: auth.actor.token, clientId: auth.actor.clientId, scopes: [], expiresAt: auth.actor.expiresAt, resource: new URL(resource), extra: { userId: auth.actor.userId } } } : {}),
    });
    const headers = new Headers(response.headers);
    Object.entries(CORS).forEach(([key, value]) => headers.set(key, value));
    if (!auth.ok && body && typeof body === "object" && "method" in body && body.method === "tools/call") headers.set("WWW-Authenticate", challenge(auth.reason === "missing"));
    return new Response(response.body, { status: response.status, headers });
  }
  async function authenticated(request: Request) {
    const auth = await verifyMaroMcpRequest(request, resource);
    if (!auth.ok) return NextResponse.json({ error: auth.reason === "missing" ? "AUTH_REQUIRED" : "AUTH_INVALID" }, { status: 401, headers: { ...CORS, "WWW-Authenticate": challenge(auth.reason === "missing") } });
    return handle(request);
  }
  return {
    async POST(request: Request) {
      const length = Number(request.headers.get("content-length") ?? "0");
      if (Number.isFinite(length) && length > MAX_BODY) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, { status: 413, headers: CORS });
      const parsed = await readJsonBody(request, MAX_BODY);
      if (!parsed.ok) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: parsed.response.status === 413 ? -32600 : -32700, message: parsed.response.status === 413 ? "Request too large" : "Parse error" } }, { status: parsed.response.status === 413 ? 413 : 400, headers: CORS });
      return handle(request, parsed.body);
    },
    GET: authenticated,
    DELETE: authenticated,
    async OPTIONS() { return new Response(null, { status: 204, headers: CORS }); },
  };
}
