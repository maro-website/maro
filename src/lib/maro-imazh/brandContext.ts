import "server-only";

import { createHash } from "node:crypto";
import type { WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";
import { buildBrainBrief, isBrainConfigured } from "@/lib/workspaces/brainProfile";
import type { WorkspaceBrand } from "@/lib/workspaces/types";
import {
  buildWorkspaceBrandBrief,
  isWorkspaceBrandConfigured,
} from "@/lib/workspaces/brand";

export type MaroImageBrandContextSource = "maro_brain" | "workspace_brand" | "none";

export interface MaroImageBrandContextTelemetry {
  context_source: MaroImageBrandContextSource;
  context_configured: boolean;
  context_workspace_hash: string;
  context_brand_hash: string | null;
  context_fingerprint: string;
  context_brand_name_present: boolean;
  context_category_present: boolean;
  context_description_present: boolean;
}

export interface CanonicalMaroImageBrandContext {
  source: MaroImageBrandContextSource;
  configured: boolean;
  brandName?: string;
  brainBrief?: string;
  workspaceBrandBrief?: string;
  logoUrl?: string;
  telemetry: MaroImageBrandContextTelemetry;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function normalizeBrandName(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

/**
 * Resolve the canonical brand payload once for every transport. The result is
 * request-local and contains safe hashed telemetry; no prompt text or private
 * workspace identifiers are exposed through MCP responses.
 */
export function resolveCanonicalMaroImageBrandContext(input: {
  workspaceId: string;
  brain?: WorkspaceBrainProfile | null;
  brand?: WorkspaceBrand | null;
}): CanonicalMaroImageBrandContext {
  const brainConfigured = Boolean(input.brain && isBrainConfigured(input.brain));
  const workspaceBrandConfigured = isWorkspaceBrandConfigured(input.brand);
  const source: MaroImageBrandContextSource = brainConfigured
    ? "maro_brain"
    : workspaceBrandConfigured
      ? "workspace_brand"
      : "none";

  const brandName = normalizeBrandName(
    source === "maro_brain" ? input.brain?.brand.name : input.brand?.name
  );
  const category = source === "maro_brain" ? input.brain?.brand.category?.trim() : undefined;
  const description =
    source === "maro_brain" ? input.brain?.brand.description?.trim() : undefined;
  const logoUrl =
    source === "maro_brain"
      ? input.brain?.brand.logoUrl?.trim() || input.brand?.logoUrl?.trim() || undefined
      : input.brand?.logoUrl?.trim() || undefined;
  const workspaceHash = digest(`workspace:${input.workspaceId}`);
  const brandHash = brandName ? digest(`brand:${brandName.toLocaleLowerCase("en")}`) : null;
  const fingerprint = digest(
    JSON.stringify({
      workspaceHash,
      brandHash,
      source,
      category: category ? digest(category.toLocaleLowerCase("en")) : null,
      description: description ? digest(description) : null,
      logo: Boolean(logoUrl),
    })
  );

  return {
    source,
    configured: source !== "none",
    brandName,
    brainBrief:
      source === "maro_brain" && input.brain ? buildBrainBrief(input.brain) : undefined,
    workspaceBrandBrief:
      workspaceBrandConfigured && input.brand
        ? buildWorkspaceBrandBrief(input.brand)
        : undefined,
    logoUrl,
    telemetry: {
      context_source: source,
      context_configured: source !== "none",
      context_workspace_hash: workspaceHash,
      context_brand_hash: brandHash,
      context_fingerprint: fingerprint,
      context_brand_name_present: Boolean(brandName),
      context_category_present: Boolean(category),
      context_description_present: Boolean(description),
    },
  };
}
