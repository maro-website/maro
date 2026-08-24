import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyMaroMcpRequest } from "@/lib/mcp/auth";
import {
  getMaroMcpChallenge,
  getMaroMcpResource,
} from "@/lib/mcp/config";
import { createMaroMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MCP_BODY_BYTES = 64 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers":
    "WWW-Authenticate, MCP-Protocol-Version, MCP-Session-Id",
};

function withCors(response: Response, challenge?: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  if (challenge) headers.set("WWW-Authenticate", challenge);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unauthorized(reason: "missing" | "invalid" = "missing") {
  const challenge = getMaroMcpChallenge({
    error: "invalid_token",
    description:
      reason === "missing"
        ? "Connect your Maro account to continue."
        : "Reconnect your Maro account to continue.",
  });
  return NextResponse.json(
    { error: reason === "missing" ? "AUTH_REQUIRED" : "AUTH_INVALID" },
    { status: 401, headers: { ...CORS_HEADERS, "WWW-Authenticate": challenge } }
  );
}

async function handle(request: Request, parsedBody?: unknown, isToolCall = false) {
  const auth = await verifyMaroMcpRequest(request);
  const server = createMaroMcpServer({ auth, request });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    keepAliveMs: 15_000,
  });
  await server.connect(transport);

  const response = await transport.handleRequest(request, {
    ...(parsedBody === undefined ? {} : { parsedBody }),
    ...(auth.ok
      ? {
          authInfo: {
            token: auth.actor.token,
            clientId: auth.actor.clientId,
            scopes: [],
            expiresAt: auth.actor.expiresAt,
            resource: new URL(getMaroMcpResource()),
            extra: { userId: auth.actor.userId },
          },
        }
      : {}),
  });

  const challenge =
    isToolCall && !auth.ok
      ? getMaroMcpChallenge({
          error: "invalid_token",
          description:
            auth.reason === "missing"
              ? "Connect your Maro account to continue."
              : "Reconnect your Maro account to continue.",
        })
      : undefined;
  return withCors(response, challenge);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_MCP_BODY_BYTES) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } },
      { status: 413, headers: CORS_HEADERS }
    );
  }

  let parsedBody: unknown;
  try {
    const text = await request.clone().text();
    if (new TextEncoder().encode(text).byteLength > MAX_MCP_BODY_BYTES) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } },
        { status: 413, headers: CORS_HEADERS }
      );
    }
    parsedBody = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const isToolCall =
    !Array.isArray(parsedBody) &&
    typeof parsedBody === "object" &&
    parsedBody !== null &&
    (parsedBody as { method?: unknown }).method === "tools/call";
  return handle(request, parsedBody, isToolCall);
}

export async function GET(request: Request) {
  const auth = await verifyMaroMcpRequest(request);
  if (!auth.ok) return unauthorized(auth.reason === "missing" ? "missing" : "invalid");
  return handle(request);
}

export async function DELETE(request: Request) {
  const auth = await verifyMaroMcpRequest(request);
  if (!auth.ok) return unauthorized(auth.reason === "missing" ? "missing" : "invalid");
  return handle(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
