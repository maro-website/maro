import type { WorkspaceBrand } from "@/lib/workspaces/types";
import { DEFAULT_WORKSPACE_BRAND } from "@/lib/workspaces/types";

export function normalizeWorkspaceBrand(raw?: Partial<WorkspaceBrand> | null): WorkspaceBrand {
  return {
    name: raw?.name?.trim() || undefined,
    logoUrl: raw?.logoUrl ?? null,
    primaryColor: raw?.primaryColor?.trim() || DEFAULT_WORKSPACE_BRAND.primaryColor,
    secondaryColor: raw?.secondaryColor?.trim() || DEFAULT_WORKSPACE_BRAND.secondaryColor,
    backgroundColor: raw?.backgroundColor?.trim() || DEFAULT_WORKSPACE_BRAND.backgroundColor,
    textColor: raw?.textColor?.trim() || DEFAULT_WORKSPACE_BRAND.textColor,
  };
}

export function isWorkspaceBrandConfigured(brand?: WorkspaceBrand | null): boolean {
  if (!brand) return false;
  return Boolean(brand.name?.trim() || brand.logoUrl);
}

export function buildWorkspaceBrandBrief(brand: WorkspaceBrand): string {
  const lines = [
    "## Workspace brand",
    brand.name ? `Brand name: ${brand.name}` : null,
    `Primary color: ${brand.primaryColor}`,
    `Secondary color: ${brand.secondaryColor}`,
    `Background: ${brand.backgroundColor}`,
    `Text color: ${brand.textColor}`,
    "Apply these brand colors consistently. Keep the mark clean, vector-friendly and professional.",
  ].filter(Boolean);
  return lines.join("\n");
}
