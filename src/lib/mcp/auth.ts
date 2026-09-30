import "server-only";

import { createClient, type JwtPayload, type SupabaseClient } from "@supabase/supabase-js";
import { getUserFromToken } from "@/lib/supabase/server";
import {
  getMaroMcpIssuer,
  getMaroMcpResource,
  type MaroMcpPermission,
} from "@/lib/mcp/config";

export type MaroMcpActor = {
  userId: string;
  clientId: string;
  token: string;
  expiresAt: number;
  permissions: MaroMcpPermission[];
};

export type MaroMcpAuthResult =
  | { ok: true; actor: MaroMcpActor }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "wrong_issuer" | "wrong_audience" | "invalid_client" | "missing_permission" };

let cachedVerifier: SupabaseClient | null = null;

function getVerifier(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  if (!cachedVerifier) {
    cachedVerifier = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedVerifier;
}

function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

function audienceMatches(aud: JwtPayload["aud"], expected: string): boolean {
  return typeof aud === "string"
    ? aud === expected
    : Array.isArray(aud) && aud.some((value) => value === expected);
}

function readPermissions(value: unknown): MaroMcpPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (permission): permission is MaroMcpPermission =>
      permission === "account:read" || permission === "image:generate"
  );
}

export function validateVerifiedMaroMcpClaims(input: {
  claims: JwtPayload & Record<string, unknown>;
  verifiedUserId: string;
  token: string;
  now?: number;
}): MaroMcpAuthResult {
  const { claims } = input;
  const issuer = getMaroMcpIssuer();
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (!issuer) return { ok: false, reason: "invalid" };
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    return { ok: false, reason: "expired" };
  }
  if (typeof claims.nbf === "number" && claims.nbf > now + 30) {
    return { ok: false, reason: "invalid" };
  }
  if (claims.iss !== issuer) return { ok: false, reason: "wrong_issuer" };
  if (!audienceMatches(claims.aud, getMaroMcpResource())) {
    return { ok: false, reason: "wrong_audience" };
  }
  if (typeof claims.sub !== "string" || claims.sub !== input.verifiedUserId) {
    return { ok: false, reason: "invalid" };
  }

  const clientId = typeof claims.client_id === "string" ? claims.client_id.trim() : "";
  if (!clientId || claims.maro_mcp !== true) {
    return { ok: false, reason: "invalid_client" };
  }

  const permissions = readPermissions(claims.maro_mcp_permissions);
  if (!permissions.length) return { ok: false, reason: "missing_permission" };

  return {
    ok: true,
    actor: {
      userId: input.verifiedUserId,
      clientId,
      token: input.token,
      expiresAt: claims.exp,
      permissions,
    },
  };
}

/**
 * Verify the Supabase access token before trusting any claim. Supabase Auth's
 * getClaims verifies ES256 against JWKS (and uses a server validation fallback
 * for symmetric/unsupported tokens). getUserFromToken then confirms that the
 * subject still maps to the existing Maro user.
 */
export async function verifyMaroMcpRequest(request: Request): Promise<MaroMcpAuthResult> {
  const token = readBearer(request);
  if (!token) return { ok: false, reason: "missing" };

  const verifier = getVerifier();
  const issuer = getMaroMcpIssuer();
  if (!verifier || !issuer) return { ok: false, reason: "invalid" };

  try {
    const [{ data, error }, user] = await Promise.all([
      verifier.auth.getClaims(token),
      getUserFromToken(token),
    ]);
    if (error || !data?.claims || !user) return { ok: false, reason: "invalid" };

    return validateVerifiedMaroMcpClaims({
      claims: data.claims as JwtPayload & Record<string, unknown>,
      verifiedUserId: user.id,
      token,
    });
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function actorHasPermission(actor: MaroMcpActor, permission: MaroMcpPermission): boolean {
  return actor.permissions.includes(permission);
}
