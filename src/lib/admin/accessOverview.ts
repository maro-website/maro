import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  ACCESS_ROLE_LABELS,
  ADMIN_ACCESS_ROLES,
  listAllPermissionKeys,
  permissionsForRole,
  resolveAccessRole,
  type AccessRole,
  type PermissionKey,
} from "./permissions";

export interface PrivilegedUserRow {
  id: string;
  email: string;
  fullName: string;
  accessRole: AccessRole | null;
  effectiveRole: AccessRole | null;
  isCreator: boolean;
  plan: string | null;
  maroPlan: string | null;
  createdAt: string;
}

export interface RoleChangeAuditRow {
  id: string;
  actorId: string | null;
  targetId: string | null;
  beforeRole: string | null;
  afterRole: string | null;
  createdAt: string;
}

export async function countSuperAdmins(excludeUserId?: string): Promise<number> {
  let q = getSupabaseAdmin()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .or("access_role.eq.super_admin,and(is_admin.eq.true,access_role.is.null)");
  if (excludeUserId) q = q.neq("id", excludeUserId);
  const { count } = await q;
  return count ?? 0;
}

export async function listPrivilegedUsers(): Promise<PrivilegedUserRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, access_role, is_admin, is_creator, plan, maro_plan, created_at")
    .or("access_role.not.is.null,is_admin.eq.true")
    .order("created_at", { ascending: false });

  const rows: PrivilegedUserRow[] = [];
  for (const row of data ?? []) {
    const effectiveRole = resolveAccessRole({
      access_role: row.access_role as string | null,
      is_admin: row.is_admin as boolean,
    });
    if (!effectiveRole) continue;
    rows.push({
      id: row.id as string,
      email: (row.email as string) ?? "",
      fullName: (row.full_name as string) ?? "",
      accessRole: (row.access_role as AccessRole | null) ?? null,
      effectiveRole,
      isCreator: Boolean(row.is_creator),
      plan: (row.plan as string | null) ?? null,
      maroPlan: (row.maro_plan as string | null) ?? null,
      createdAt: row.created_at as string,
    });
  }
  return rows;
}

export async function listRecentRoleChanges(limit = 15): Promise<RoleChangeAuditRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("audit_events")
    .select("id, actor_id, target_id, before_state, after_state, created_at")
    .eq("action", "user.role_changed")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    actorId: (row.actor_id as string | null) ?? null,
    targetId: (row.target_id as string | null) ?? null,
    beforeRole: ((row.before_state as { access_role?: string | null } | null)?.access_role ??
      null) as string | null,
    afterRole: ((row.after_state as { access_role?: string | null } | null)?.access_role ??
      null) as string | null,
    createdAt: row.created_at as string,
  }));
}

export function buildPermissionMatrix(): Record<AccessRole, Record<PermissionKey, boolean>> {
  const keys = listAllPermissionKeys();
  const matrix = {} as Record<AccessRole, Record<PermissionKey, boolean>>;
  for (const role of ADMIN_ACCESS_ROLES) {
    const allowed = new Set(permissionsForRole(role));
    matrix[role] = {} as Record<PermissionKey, boolean>;
    for (const key of keys) {
      matrix[role][key] = allowed.has(key);
    }
  }
  return matrix;
}

export function buildAccessOverviewPayload(actor: { userId: string; email: string; role: AccessRole }) {
  return {
    actor,
    roles: ADMIN_ACCESS_ROLES.map((role) => ({
      id: role,
      label: ACCESS_ROLE_LABELS[role],
      permissions: [...permissionsForRole(role)],
    })),
    permissionKeys: listAllPermissionKeys(),
    matrix: buildPermissionMatrix(),
  };
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, access_role, is_admin, is_creator, plan, maro_plan, created_at")
    .ilike("email", normalized)
    .maybeSingle();

  if (!data) return null;

  const effectiveRole = resolveAccessRole({
    access_role: data.access_role as string | null,
    is_admin: data.is_admin as boolean,
  });

  return {
    id: data.id as string,
    email: (data.email as string) ?? "",
    fullName: (data.full_name as string) ?? "",
    accessRole: (data.access_role as AccessRole | null) ?? null,
    effectiveRole,
    isCreator: Boolean(data.is_creator),
    plan: (data.plan as string | null) ?? null,
    maroPlan: (data.maro_plan as string | null) ?? null,
    createdAt: data.created_at as string,
  };
}
