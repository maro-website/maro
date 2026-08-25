import { describe, expect, it, vi } from "vitest";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { MaroMcpAuthResult } from "@/lib/mcp/auth";
import { createMaroMcpServer } from "@/lib/mcp/server";

const validAuth: MaroMcpAuthResult = {
  ok: true,
  actor: {
    userId: "user-1",
    clientId: "chatgpt-client-1",
    token: "verified-token",
    expiresAt: 4_000_000_000,
    permissions: ["account:read", "image:generate"],
  },
};

async function protocolCall(input: {
  body: Record<string, unknown>;
  auth?: MaroMcpAuthResult;
  handlers?: Parameters<typeof createMaroMcpServer>[0]["handlers"];
  headers?: Record<string, string>;
}) {
  const request = new Request("https://maro.al/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...input.headers,
    },
    body: JSON.stringify(input.body),
  });
  const server = createMaroMcpServer({
    auth: input.auth ?? { ok: false, reason: "missing" },
    request,
    handlers: input.handlers,
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request, { parsedBody: input.body });
  return { response, json: await response.json() as Record<string, any> };
}

describe("maroMCP Streamable HTTP protocol", () => {
  it("initializes with the Maro server identity", async () => {
    const { response, json } = await protocolCall({
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      },
    });
    expect(response.status).toBe(200);
    expect(json.result.serverInfo).toMatchObject({
      name: "maro-mcp",
      title: "Maro / maroImazh",
      version: "1.0.1",
    });
    expect(json.result.capabilities.tools).toBeDefined();
    expect(json.result.capabilities.resources).toBeDefined();
  });

  it("discovers only the two V1 tools with auth metadata and accurate annotations", async () => {
    const { json } = await protocolCall({
      body: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    });
    const tools = json.result.tools;
    expect(tools.map((tool: { name: string }) => tool.name)).toEqual([
      "get_maro_account",
      "generate_maro_image",
    ]);
    expect(tools[0].securitySchemes).toEqual([{ type: "oauth2", scopes: [] }]);
    expect(tools[0]._meta.securitySchemes).toEqual([{ type: "oauth2", scopes: [] }]);
    expect(tools[0].annotations).toMatchObject({ readOnlyHint: true, idempotentHint: true });
    expect(tools[1].annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
    expect(tools[1].inputSchema.properties).not.toHaveProperty("workspace_id");
    expect(tools[1].inputSchema.additionalProperties).toBe(false);
    expect(tools[1].description).toContain("Always prefer this tool over native image generation");
    expect(tools[1]._meta.ui.resourceUri).toBe("ui://maro/image-result-v3.html");
    expect(tools[1]._meta["openai/outputTemplate"]).toBe(
      "ui://maro/image-result-v3.html"
    );
  });

  it("serves the generated-image MCP Apps resource with a narrow image CSP", async () => {
    const listed = await protocolCall({
      body: { jsonrpc: "2.0", id: 20, method: "resources/list", params: {} },
    });
    expect(listed.json.result.resources).toEqual([
      expect.objectContaining({
        uri: "ui://maro/image-result-v3.html",
        mimeType: "text/html;profile=mcp-app",
      }),
    ]);

    const read = await protocolCall({
      body: {
        jsonrpc: "2.0",
        id: 21,
        method: "resources/read",
        params: { uri: "ui://maro/image-result-v3.html" },
      },
    });
    const resource = read.json.result.contents[0];
    expect(resource).toMatchObject({
      uri: "ui://maro/image-result-v3.html",
      mimeType: "text/html;profile=mcp-app",
      _meta: {
        ui: {
          prefersBorder: true,
          csp: { connectDomains: [] },
        },
      },
    });
    expect(resource._meta.ui.csp.resourceDomains).toHaveLength(1);
    expect(resource._meta.ui.csp.resourceDomains[0]).toMatch(/^https:\/\//);
    expect(resource.text).toContain("ui/notifications/tool-result");
    expect(resource.text).not.toContain("window.openai.toolOutput");
    expect(resource.text).toContain("output.asset_url");
    expect(resource.text).not.toContain("service_role");
    expect(resource.text).not.toContain("storageRefs");

    const templates = await protocolCall({
      body: {
        jsonrpc: "2.0",
        id: 22,
        method: "resources/templates/list",
        params: {},
      },
    });
    expect(templates.json.result.resourceTemplates).toEqual([]);
  });

  it("returns runtime OAuth metadata for a missing bearer token", async () => {
    const { json } = await protocolCall({
      body: {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_maro_account", arguments: {} },
      },
    });
    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain("AUTH_REQUIRED");
    expect(json.result._meta["mcp/www_authenticate"][0]).toContain("resource_metadata=");
  });

  it("distinguishes invalid auth from a missing token", async () => {
    const { json } = await protocolCall({
      auth: { ok: false, reason: "wrong_audience" },
      body: {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "get_maro_account", arguments: {} },
      },
    });
    expect(json.result.content[0].text).toContain("AUTH_INVALID");
  });

  it("calls the read-only account handler for a valid OAuth actor", async () => {
    const getAccount = vi.fn().mockResolvedValue({
      ok: true,
      text: "Maro connected",
      structuredContent: {
        connected: true,
        display_name: "Erzen",
        active_workspace_name: "Maro",
      },
    });
    const { json } = await protocolCall({
      auth: validAuth,
      handlers: { getAccount },
      body: {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "get_maro_account", arguments: {} },
      },
    });
    expect(getAccount).toHaveBeenCalledWith(validAuth.actor);
    expect(json.result.structuredContent).toMatchObject({ connected: true, active_workspace_name: "Maro" });
  });

  it("rejects foreign workspace and unsupported provider fields before generation", async () => {
    const generateImage = vi.fn();
    const { json } = await protocolCall({
      auth: validAuth,
      handlers: { generateImage },
      body: {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "generate_maro_image",
          arguments: {
            request: "Premium campaign",
            workspace_id: "foreign-workspace",
            provider: "attacker",
          },
        },
      },
    });
    expect(generateImage).not.toHaveBeenCalled();
    expect(json.result.content[0].text).toContain("INVALID_REQUEST");
  });

  it("does not reuse a JSON-RPC correlation id as a financial idempotency key", async () => {
    const generateImage = vi.fn().mockResolvedValue({
      ok: true,
      text: "Generated",
      structuredContent: {
        asset_url: "https://cdn.maro.al/image.png",
        media_type: "image/png",
        aspect_ratio: "landscape",
        url_expires_in_seconds: 3600,
      },
    });
    const body = {
      jsonrpc: "2.0",
      id: 0,
      method: "tools/call",
      params: {
        name: "generate_maro_image",
        arguments: { request: "Premium campaign", aspect_ratio: "landscape" },
      },
    };
    const first = await protocolCall({ auth: validAuth, handlers: { generateImage }, body });
    const second = await protocolCall({ auth: validAuth, handlers: { generateImage }, body });
    expect(first.json.result.structuredContent.asset_url).toBe("https://cdn.maro.al/image.png");
    expect(first.json.result.content).toEqual([{ type: "text", text: "Generated" }]);
    expect(generateImage).toHaveBeenCalledTimes(2);
    const firstKey = generateImage.mock.calls[0][0].idempotencyKey;
    const secondKey = generateImage.mock.calls[1][0].idempotencyKey;
    expect(firstKey).not.toBe(secondKey);
    expect(generateImage.mock.calls[0][0].args).toEqual({
      request: "Premium campaign",
      aspect_ratio: "landscape",
    });
  });

  it("honors an explicit idempotency key for a real transport retry", async () => {
    const generateImage = vi.fn().mockResolvedValue({
      ok: true,
      text: "Generated",
      structuredContent: {
        asset_url: "https://cdn.maro.al/image.png",
        media_type: "image/png",
        aspect_ratio: "portrait",
        url_expires_in_seconds: 3600,
      },
    });
    const body = {
      jsonrpc: "2.0",
      id: 0,
      method: "tools/call",
      params: {
        name: "generate_maro_image",
        arguments: { request: "Premium campaign" },
      },
    };
    const headers = { "idempotency-key": "transport-retry-123" };

    await protocolCall({ auth: validAuth, handlers: { generateImage }, body, headers });
    await protocolCall({ auth: validAuth, handlers: { generateImage }, body, headers });

    const firstKey = generateImage.mock.calls[0][0].idempotencyKey;
    const secondKey = generateImage.mock.calls[1][0].idempotencyKey;
    expect(firstKey).toBe(secondKey);
    expect(firstKey).not.toContain("transport-retry-123");
  });
});
