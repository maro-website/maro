// Central RBAC definitions for Maro Control Center.
// Client-safe: permission keys and role labels only.

export type AccessRole = "super_admin" | "administrator" | "developer" | "editor";

export const ACCESS_ROLE_LABELS: Record<AccessRole, string> = {
  super_admin: "Super Admin",
  administrator: "Administrator",
  developer: "Developer",
  editor: "Editor",
};

/** Stable permission keys — keep the list focused on Phase 0/1 needs. */
export type PermissionKey =
  | "admin.access"
  | "users.view"
  | "users.manage"
  | "credits.adjust"
  | "payments.view"
  | "payments.refund"
  | "creators.manage"
  | "engine.view"
  | "engine.manage"
  | "engine.publish"
  | "presets.manage"
  | "notifications.manage"
  | "operations.view"
  | "security.manage"
  | "analytics.view"
  | "audit.view"
  | "help.manage";

const ALL_PERMISSIONS: PermissionKey[] = [
  "admin.access",
  "users.view",
  "users.manage",
  "credits.adjust",
  "payments.view",
  "payments.refund",
  "creators.manage",
  "engine.view",
  "engine.manage",
  "engine.publish",
  "presets.manage",
  "notifications.manage",
  "operations.view",
  "security.manage",
  "analytics.view",
  "audit.view",
  "help.manage",
];

const ROLE_PERMISSIONS: Record<AccessRole, readonly PermissionKey[]> = {
  super_admin: ALL_PERMISSIONS,
  administrator: [
    "admin.access",
    "users.view",
    "users.manage",
    "credits.adjust",
    "payments.view",
    "payments.refund",
    "creators.manage",
    "engine.view",
    "engine.manage",
    "engine.publish",
    "presets.manage",
    "notifications.manage",
    "operations.view",
    "security.manage",
    "analytics.view",
    "audit.view",
    "help.manage",
  ],
  developer: [
    "admin.access",
    "users.view",
    "engine.view",
    "engine.manage",
    "engine.publish",
    "presets.manage",
    "operations.view",
    "security.manage",
    "analytics.view",
    "audit.view",
    "help.manage",
  ],
  editor: [
    "admin.access",
    "presets.manage",
    "notifications.manage",
    "analytics.view",
    "help.manage",
  ],
};

export function isAccessRole(value: string | null | undefined): value is AccessRole {
  return (
    value === "super_admin" ||
    value === "administrator" ||
    value === "developer" ||
    value === "editor"
  );
}

/** Resolve effective role from profile fields (legacy is_admin fallback). */
export function resolveAccessRole(profile: {
  access_role?: string | null;
  is_admin?: boolean;
}): AccessRole | null {
  if (isAccessRole(profile.access_role ?? null)) return profile.access_role as AccessRole;
  if (profile.is_admin) return "super_admin";
  return null;
}

export function hasPermission(role: AccessRole | null, permission: PermissionKey): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(role: AccessRole): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[role];
}

/** Minimum permission to enter /admin at all. */
export const ADMIN_ENTRY_PERMISSION: PermissionKey = "admin.access";
