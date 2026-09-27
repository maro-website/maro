import "server-only";
import { getProfileCredits, getUserFromToken } from "@/lib/supabase/server";
import {
  ADMIN_ENTRY_PERMISSION,
  hasPermission,
  resolveAccessRole,
  type AccessRole,
  type PermissionKey,
} from "./permissions";
import { assertAdminMfa, type MfaGateReason } from "./mfa";

export interface AdminAuthContext {
  userId: string;
  email: string;
  role: AccessRole;
}

export type AdminAuthError = "forbidden" | "insufficient_permission" | MfaGateReason;

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export function requestId(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

/** Load admin context from Bearer token. Returns null if not a privileged admin. */
export async function getAdminAuth(req: Request): Promise<AdminAuthContext | null> {
  const token = bearer(req);
  const user = await getUserFromToken(token);
  if (!user) return null;

  const profile = await getProfileCredits(user.id);
  if (!profile) return null;

  const role = resolveAccessRole(profile);
  if (!role || !hasPermission(role, ADMIN_ENTRY_PERMISSION)) return null;

  const mfa = await assertAdminMfa({ userId: user.id, role, accessToken: token });
  if (!mfa.ok) return null;

  return {
    userId: user.id,
    email: profile.email ?? user.email ?? "",
    role,
  };
}

export type RequirePermissionResult =
  | { ok: true; admin: AdminAuthContext; requestId: string }
  | { ok: false; status: number; error: AdminAuthError };

/** Central authorization gate for admin APIs. */
export async function requirePermission(
  req: Request,
  permission: PermissionKey
): Promise<RequirePermissionResult> {
  const rid = requestId(req);
  const token = bearer(req);
  const user = await getUserFromToken(token);
  if (!user) return { ok: false, status: 403, error: "forbidden" };

  const profile = await getProfileCredits(user.id);
  if (!profile) return { ok: false, status: 403, error: "forbidden" };

  const role = resolveAccessRole(profile);
  if (!role || !hasPermission(role, ADMIN_ENTRY_PERMISSION)) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  const mfa = await assertAdminMfa({ userId: user.id, role, accessToken: token });
  if (!mfa.ok) return { ok: false, status: 403, error: mfa.reason };

  if (!hasPermission(role, permission)) {
    return { ok: false, status: 403, error: "insufficient_permission" };
  }

  return {
    ok: true,
    admin: { userId: user.id, email: profile.email ?? user.email ?? "", role },
    requestId: rid,
  };
}

/** Backwards-compatible alias used while migrating routes from requireAdmin. */
export async function requireAdmin(req: Request): Promise<AdminAuthContext | null> {
  const result = await requirePermission(req, ADMIN_ENTRY_PERMISSION);
  return result.ok ? result.admin : null;
}
