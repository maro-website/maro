import { describe, expect, it } from "vitest";
import { workspaceCreationAction, workspaceLimitNotice } from "@/lib/workspaces/creationPolicy";
import type { ResolvedEntitlements } from "@/lib/commerce/types";
type Policy = Pick<ResolvedEntitlements, "workspace_limit" | "current_workspace_count" | "plan_id" | "plan_status">;
const standard: Policy = { workspace_limit: 1, current_workspace_count: 1, plan_id: "standard", plan_status: "ACTIVE" };
describe("workspace creation uses account quotas before plan messaging", () => {
  it("offers Pro for active Standard at its one workspace cap", () => {
    expect(workspaceCreationAction(standard)).toBe("upgrade");
    expect(workspaceLimitNotice(standard)).toMatchObject({ href: "/pricing", label: "Kalo në Pro" });
    expect(workspaceCreationAction({ ...standard, plan_status: "RENEWAL_WINDOW" })).toBe("upgrade");
  });
  it("sends Pro users at five to the contact page", () => {
    const pro: Policy = { ...standard, plan_id: "pro", workspace_limit: 5, current_workspace_count: 5 };
    expect(workspaceCreationAction(pro)).toBe("contact");
    expect(workspaceLimitNotice(pro)).toMatchObject({ href: "/contact", label: "Na kontakto" });
  });
  it.each(["standard", "pro", "business", null] as const)("allows a sixth whenever the account permits it: %s", plan_id => {
    expect(workspaceCreationAction({ ...standard, plan_id, workspace_limit: 6, current_workspace_count: 5 })).toBe("create");
  });
  it("continues beyond five with larger limits, then contacts at the actual cap", () => {
    expect(workspaceCreationAction({ ...standard, workspace_limit: 20, current_workspace_count: 19 })).toBe("create");
    const atCap = { ...standard, workspace_limit: 20, current_workspace_count: 20 };
    expect(workspaceCreationAction(atCap)).toBe("contact");
    expect(workspaceLimitNotice(atCap).description).toContain("20");
  });
  it("uses plans for free/expired/suspended accounts at the default cap and honors larger allowances", () => {
    for (const plan_status of ["NO_PLAN", "EXPIRED", "BUSINESS_EXPIRED", "BUSINESS_SUSPENDED"] as const) {
      expect(workspaceCreationAction({ ...standard, plan_status })).toBe("plans");
      expect(workspaceCreationAction({ ...standard, plan_status, workspace_limit: 6, current_workspace_count: 5 })).toBe("create");
    }
  });
  it("blocks when an admin lowers the limit below the current count", () => {
    expect(workspaceCreationAction({ ...standard, plan_id: "pro", current_workspace_count: 6, workspace_limit: 3 })).toBe("contact");
  });
  it.each([0, -1, 1.5, NaN, Infinity, undefined, "6"])("fails closed for malformed limits: %s", limit => {
    expect(() => workspaceCreationAction({ ...standard, workspace_limit: limit as number })).toThrow("workspace_policy_unavailable");
  });
});
