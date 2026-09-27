import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_ROUTES,
  LEGACY_ADMIN_TAB_REDIRECTS,
  adminNavGroupForPath,
  isAdminNavActive,
  resolveLegacyAdminTabRedirect,
} from "@/lib/admin/routes";
import {
  ADMIN_ACCESS_ROLES,
  hasPermission,
  permissionsForRole,
} from "@/lib/admin/permissions";
import { seedEngineFromLegacy, getEngineSeedStatus } from "@/lib/engine/seed";

describe("Admin consolidation — canonical routes", () => {
  it("maps legacy tabs to dedicated routes", () => {
    expect(resolveLegacyAdminTabRedirect("users")).toBe(ADMIN_ROUTES.users);
    expect(resolveLegacyAdminTabRedirect("prompt")).toBe(ADMIN_ROUTES.engine);
    expect(resolveLegacyAdminTabRedirect("analytics")).toBe(ADMIN_ROUTES.analytics.presets);
    expect(resolveLegacyAdminTabRedirect("overview")).toBe(ADMIN_ROUTES.dashboard);
  });

  it("does not expose legacy query routes in primary nav", () => {
    const hrefs = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs.every((h) => !h.includes("?tab="))).toBe(true);
    expect(hrefs).not.toContain("/admin/presets/categories");
    expect(hrefs).not.toContain("/admin?tab=prompt");
    expect(hrefs).not.toContain("/admin?tab=fort");
  });

  it("highlights engine presets separately from engine overview", () => {
    expect(isAdminNavActive("/admin/engine", ADMIN_ROUTES.engine)).toBe(true);
    expect(isAdminNavActive("/admin/engine/presets", ADMIN_ROUTES.engine)).toBe(false);
    expect(isAdminNavActive("/admin/engine/presets", ADMIN_ROUTES.presets)).toBe(true);
  });

  it("expands the active nav group", () => {
    expect(adminNavGroupForPath("/admin/engine/presets")).toBe("engine");
    expect(adminNavGroupForPath("/admin/operations/security")).toBe("operations");
  });

  it("redirects security alias to operations path", () => {
    expect(LEGACY_ADMIN_TAB_REDIRECTS.orders).toBe(ADMIN_ROUTES.commerce.payments);
  });
});

describe("Admin consolidation — engine seed safety", () => {
  it("exports idempotent seed helpers", () => {
    expect(typeof seedEngineFromLegacy).toBe("function");
    expect(typeof getEngineSeedStatus).toBe("function");
  });
});

describe("Admin consolidation — access roles", () => {
  it("uses four fixed admin roles only", () => {
    expect(ADMIN_ACCESS_ROLES).toEqual(["super_admin", "administrator", "developer", "editor"]);
  });

  it("keeps editor out of security management", () => {
    expect(hasPermission("editor", "security.manage")).toBe(false);
    expect(hasPermission("editor", "emails.manage")).toBe(false);
    expect(hasPermission("super_admin", "users.manage")).toBe(true);
  });

  it("maps access nav to users.manage permission", () => {
    const accessItem = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === ADMIN_ROUTES.access);
    expect(accessItem?.permission).toBe("users.manage");
    expect(permissionsForRole("administrator")).toContain("users.manage");
  });
});
