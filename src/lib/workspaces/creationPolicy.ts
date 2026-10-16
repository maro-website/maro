import type { ResolvedEntitlements } from "@/lib/commerce/types";

type WorkspacePolicy = Pick<ResolvedEntitlements, "workspace_limit" | "current_workspace_count" | "plan_id" | "plan_status">;
export type WorkspaceCreationAction = "create" | "upgrade" | "plans" | "contact";

export function workspaceCreationAction(policy: WorkspacePolicy): WorkspaceCreationAction {
  const limit = policy.workspace_limit;
  const count = policy.current_workspace_count;
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(count) || count < 0) throw new Error("workspace_policy_unavailable");
  if (count < limit) return "create";
  const active = ["ACTIVE", "RENEWAL_WINDOW", "BUSINESS_ACTIVE"].includes(policy.plan_status);
  if (limit === 1 && active && policy.plan_id === "standard") return "upgrade";
  if (limit === 1 && !active) return "plans";
  return "contact";
}

export function workspaceLimitNotice(policy: WorkspacePolicy) {
  const action = workspaceCreationAction(policy);
  if (action === "upgrade") return {
    title: "Limiti i planit Standard",
    description: "maroStandard përfshin 1 workspace. Për deri në 5 workspace, kalo në maroPro.",
    href: "/pricing", label: "Kalo në Pro",
  };
  if (action === "plans") return {
    title: "Limiti i workspace-ve",
    description: "Llogaria jote lejon 1 workspace. Shiko planet për më shumë workspace.",
    href: "/pricing", label: "Shiko planet",
  };
  return {
    title: "Më shumë workspace",
    description: `Ke arritur limitin prej ${policy.workspace_limit} workspace-ve. Për më shumë, na kontakto.`,
    href: "/contact", label: "Na kontakto",
  };
}
