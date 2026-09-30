export const MARO_MCP_DEFAULT_RESOURCE = "https://maro.al/api/mcp";
export const MARO_MCP_PERMISSIONS = ["account:read", "image:generate"] as const;

export type MaroMcpPermission = (typeof MARO_MCP_PERMISSIONS)[number];

export function getMaroMcpResource(): string {
  const configured = process.env.MARO_MCP_RESOURCE_URL?.trim();
  if (!configured) return MARO_MCP_DEFAULT_RESOURCE;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      return MARO_MCP_DEFAULT_RESOURCE;
    }
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return MARO_MCP_DEFAULT_RESOURCE;
  }
}

export function getMaroMcpIssuer(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return null;
  try {
    const url = new URL(base);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/auth/v1`;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getMaroMcpProtectedResourceMetadataUrl(): string {
  const resource = new URL(getMaroMcpResource());
  return `${resource.origin}/.well-known/oauth-protected-resource${resource.pathname}`;
}

export function getMaroMcpChallenge(input?: {
  error?: "invalid_token" | "insufficient_scope";
  description?: string;
}): string {
  const parts = [
    `Bearer resource_metadata="${getMaroMcpProtectedResourceMetadataUrl()}"`,
  ];
  if (input?.error) parts.push(`error="${input.error}"`);
  if (input?.description) {
    const safe = input.description.replace(/["\\\r\n]/g, " ").slice(0, 160);
    parts.push(`error_description="${safe}"`);
  }
  return parts.join(", ");
}

export function getMaroProtectedResourceMetadata() {
  const issuer = getMaroMcpIssuer();
  return {
    resource: getMaroMcpResource(),
    authorization_servers: issuer ? [issuer] : [],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://maro.al/mcp",
  };
}
