import type { WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";

/** Existing imports predate the explicit marker. Preserve their completed state. */
export function hasBrandImport(profile: WorkspaceBrainProfile): boolean {
  const brand = profile.brand;
  return Boolean(brand.fetchBrandImportedAt || (brand.name.trim() && brand.website.trim() && brand.logoStorageRef));
}

/** Summary only: never change the original brand context or export text. */
export function compactBrandLocation(profile: WorkspaceBrainProfile): string {
  return [profile.brand.category, profile.brand.location || profile.market.region].filter(Boolean).join(" · ");
}
