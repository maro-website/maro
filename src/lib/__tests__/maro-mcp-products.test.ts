import { describe, expect, it, vi } from "vitest";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMaroBrainMcpServer } from "@/lib/mcp/brainServer";
import { createMaroMcpServer } from "@/lib/mcp/server";
import { validateVerifiedMaroMcpClaims, type MaroMcpAuthResult } from "@/lib/mcp/auth";
import { getProductMcpResource } from "@/lib/mcp/config";

const auth: MaroMcpAuthResult = { ok: true, actor: { userId: "owner", clientId: "brain-client", token: "verified", expiresAt: 4000000000, permissions: ["account:read","brain:read","brain:write"] } };
async function call(body: Record<string, unknown>, input: { auth?: MaroMcpAuthResult; handler?: Parameters<typeof createMaroBrainMcpServer>[0]["handler"] } = {}) {
  const request = new Request(getProductMcpResource("brain"), { method: "POST", headers: { "content-type": "application/json", accept: "application/json,text/event-stream" }, body: JSON.stringify(body) });
  const server = createMaroBrainMcpServer({ auth: input.auth ?? auth, handler: input.handler, request, resource: getProductMcpResource("brain") });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request, { parsedBody: body });
  return response.json();
}
const rpc = (method: string, params: Record<string, unknown> = {}) => ({ jsonrpc: "2.0", id: 1, method, params });
describe("independent Maro MCP products", () => {
  it("discovers Brain operations without image generation or hidden execution", async () => {
    const data = await call(rpc("tools/list"));
    expect(data.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["get_maro_account","get_maro_brand","search_maro_brand_memory","save_maro_brand_memory","update_maro_brand","get_maro_brand_history","delete_maro_brand_memory"]);
    expect(data.result.tools.find((tool: { name: string }) => tool.name === "delete_maro_brand_memory").annotations.destructiveHint).toBe(true);
    for (const tool of data.result.tools) {
      expect(tool.securitySchemes).toEqual([{ type: "oauth2", scopes: ["openid", "profile", "offline_access"] }]);
      expect(tool._meta.securitySchemes).toEqual(tool.securitySchemes);
    }
  });
  it("challenges the Brain resource when unauthenticated", async () => {
    const data = await call(rpc("tools/call", { name: "get_maro_brand", arguments: {} }), { auth: { ok: false, reason: "missing" } });
    expect(data.result.isError).toBe(true);
    expect(data.result._meta["mcp/www_authenticate"][0]).toContain("/api/mcp/brain");
    expect(data.result._meta["mcp/www_authenticate"][0]).toContain('scope="openid profile offline_access"');
  });
  it("does not execute Brain reads with image permissions", async () => {
    const handler = vi.fn();
    const imageAuth = { ok: true, actor: { ...(auth as Extract<MaroMcpAuthResult,{ok:true}>).actor, permissions: ["image:generate"] } } as MaroMcpAuthResult;
    const data = await call(rpc("tools/call", { name: "get_maro_brand", arguments: {} }), { auth: imageAuth, handler });
    expect(data.result.isError).toBe(true); expect(handler).not.toHaveBeenCalled();
  });
  it("does not execute writes with only Brain read permission", async () => {
    const handler = vi.fn();
    const readAuth = { ok: true, actor: { ...(auth as Extract<MaroMcpAuthResult,{ok:true}>).actor, permissions: ["brain:read"] } } as MaroMcpAuthResult;
    await call(rpc("tools/call", { name: "save_maro_brand_memory", arguments: { key: "tone", content: "Friendly", source: "User decision", expected_revision: 0 } }), { auth: readAuth, handler });
    expect(handler).not.toHaveBeenCalled();
  });
  it("rejects injected foreign workspace and missing conflict revision", async () => {
    const handler = vi.fn();
    const data = await call(rpc("tools/call", { name: "save_maro_brand_memory", arguments: { key: "tone", content: "Friendly", source: "User decision", workspace_id: "foreign" } }), { handler });
    expect(data.result.isError).toBe(true); expect(handler).not.toHaveBeenCalled();
  });
  it("passes a validated explicit fact to the actor-bound handler", async () => {
    const handler = vi.fn().mockResolvedValue({ saved: true, revision: 7 });
    const args = { key: "tone", content: "Friendly", source: "User decision", expected_revision: 0 };
    const data = await call(rpc("tools/call", { name: "save_maro_brand_memory", arguments: args }), { handler });
    expect(data.result.structuredContent).toEqual({ saved: true, revision: 7 });
    expect(handler).toHaveBeenCalledWith("save_maro_brand_memory", (auth as Extract<MaroMcpAuthResult,{ok:true}>).actor, args);
  });
  it("returns a readable version conflict without a raw database exception", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("MEMORY_CONFLICT"));
    const data = await call(rpc("tools/call", { name: "save_maro_brand_memory", arguments: { key: "tone", content: "Friendly", source: "User", expected_revision: 0 } }), { handler });
    expect(data.result.isError).toBe(true); expect(data.result.content[0].text).toContain("MEMORY_CONFLICT");
  });
  it("keeps token audiences separate even when signatures and users are valid", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    const claims = { iss: "https://example.supabase.co/auth/v1", sub: "owner", exp: 4000000000, iat: 1, role: "maro_mcp", aal: "aal1" as const, session_id: "session", aud: getProductMcpResource("imazh"), client_id: "image-client", maro_mcp: true, maro_mcp_permissions: ["image:generate"] };
    expect(validateVerifiedMaroMcpClaims({ claims, verifiedUserId: "owner", token: "verified", resource: getProductMcpResource("brain") })).toEqual({ ok: false, reason: "wrong_audience" });
    vi.unstubAllEnvs();
  });
  it("adds status only to the standalone image product", async () => {
    const request = new Request(getProductMcpResource("imazh"));
    const server = createMaroMcpServer({ auth: { ok: false, reason: "missing" }, request, standalone: true, resource: getProductMcpResource("imazh") });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true }); await server.connect(transport);
    const body = rpc("tools/list");
    const response = await transport.handleRequest(new Request(request.url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json,text/event-stream" }, body: JSON.stringify(body) }), { parsedBody: body });
    const data = await response.json(); expect(data.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["get_maro_account","generate_maro_image","get_maro_image_status"]);
    for (const tool of data.result.tools) {
      expect(tool.securitySchemes).toEqual([{ type: "oauth2", scopes: ["openid", "profile", "offline_access"] }]);
      expect(tool._meta.securitySchemes).toEqual(tool.securitySchemes);
    }
  });
});
