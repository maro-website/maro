import type { AccessRole } from "./permissions";

export const PRIVILEGED_MFA_ROLES: readonly AccessRole[] = [
  "super_admin",
  "administrator",
  "developer",
] as const;

export function roleRequiresMfa(role: AccessRole): boolean {
  return (PRIVILEGED_MFA_ROLES as readonly string[]).includes(role);
}

export function decodeJwtAal(accessToken: string | null | undefined): "aal1" | "aal2" | null {
  if (!accessToken) return null;
  try {
    const part = accessToken.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(json) as { aal?: string };
    if (payload.aal === "aal2") return "aal2";
    if (payload.aal === "aal1") return "aal1";
    return "aal1";
  } catch {
    return null;
  }
}
