import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateVerifiedMaroMcpClaims } from "@/lib/mcp/auth";
import {
  getMaroMcpChallenge,
  getMaroMcpProtectedResourceMetadataUrl,
  getMaroProtectedResourceMetadata,
} from "@/lib/mcp/config";

const NOW = 2_000_000_000;
const ISSUER = "https://project.supabase.co/auth/v1";
const RESOURCE = "https://maro.al/api/mcp";

function claims(overrides: Record<string, unknown> = {}) {
  return {
    sub: "user-1",
    iss: ISSUER,
    aud: RESOURCE,
    exp: NOW + 3600,
    iat: NOW - 60,
    role: "authenticated",
    aal: "aal1",
    session_id: "session-1",
    client_id: "chatgpt-dcr-client",
    maro_mcp: true,
    maro_mcp_permissions: ["account:read", "image:generate"],
    ...overrides,
  };
}

describe("maroMCP OAuth resource boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("MARO_MCP_RESOURCE_URL", RESOURCE);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("publishes path-specific protected resource metadata", () => {
    expect(getMaroProtectedResourceMetadata()).toEqual({
      resource: RESOURCE,
      authorization_servers: [ISSUER],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://maro.al/mcp",
    });
    expect(getMaroMcpProtectedResourceMetadataUrl()).toBe(
      "https://maro.al/.well-known/oauth-protected-resource/api/mcp"
    );
  });

  it("keeps direct Maro sessions unchanged in the deployable OAuth claims hook", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/0046_maro_mcp_oauth_claims.sql"),
      "utf8"
    );
    expect(migration).toContain("claims ->> 'client_id'");
    expect(migration).toContain("https://maro.al/api/mcp");
    expect(migration).toContain("maro_mcp_permissions");
    expect(migration).toContain("supabase_auth_admin");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).not.toContain("security definer");
  });

  it("builds the RFC challenge without leaking secrets", () => {
    const challenge = getMaroMcpChallenge({
      error: "invalid_token",
      description: 'Reconnect\n"now"',
    });
    expect(challenge).toContain('Bearer resource_metadata="https://maro.al/.well-known/oauth-protected-resource/api/mcp"');
    expect(challenge).toContain('error="invalid_token"');
    expect(challenge).not.toContain("\n");
  });

  it("accepts a signature-verified resource-bound OAuth user", () => {
    const result = validateVerifiedMaroMcpClaims({
      claims: claims(),
      verifiedUserId: "user-1",
      token: "verified-token",
      now: NOW,
    });
    expect(result).toMatchObject({
      ok: true,
      actor: {
        userId: "user-1",
        clientId: "chatgpt-dcr-client",
        permissions: ["account:read", "image:generate"],
      },
    });
  });

  it.each([
    ["expired", { exp: NOW - 1 }, "expired"],
    ["wrong issuer", { iss: "https://attacker.test" }, "wrong_issuer"],
    ["wrong audience", { aud: "authenticated" }, "wrong_audience"],
    ["missing client", { client_id: undefined }, "invalid_client"],
    ["missing Maro gate", { maro_mcp: false }, "invalid_client"],
    ["missing permission", { maro_mcp_permissions: [] }, "missing_permission"],
    ["wrong subject", { sub: "foreign-user" }, "invalid"],
  ])("rejects %s", (_label, override, reason) => {
    const result = validateVerifiedMaroMcpClaims({
      claims: claims(override),
      verifiedUserId: "user-1",
      token: "verified-token",
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason });
  });
});
