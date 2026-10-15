import type { WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";

// Private Railway pilot. Public rollout requires an explicit code change.
export const BRAND_FETCH_PILOT_USER_ID = "fec01baa-8451-4112-84fb-8552f8b31686";
export const canFetchBrand = (userId?: string | null) => userId === BRAND_FETCH_PILOT_USER_ID;

export type ImportTextKey = "name" | "description" | "website" | "phone" | "location" | "language";
export interface BrandFact { value: string; source: string }
export interface BrandLogoCandidate { url: string; source: string; kind: "logo" | "icon" }
export interface FetchedBrand {
  fields: Partial<Record<ImportTextKey, BrandFact>>;
  channels: Array<{ platform: string; handle: string }>;
  colors: string[];
  logos: BrandLogoCandidate[];
  pages: string[];
  warnings: string[];
  fetchedAt: string;
  aiUsed: false;
}

/** Only explicitly selected fields are applied to the latest editor draft. */
export function applyFetchedBrand(profile: WorkspaceBrainProfile, result: FetchedBrand, selected: string[], logo?: { url: string; storageRef: string }): WorkspaceBrainProfile {
  const brand = { ...profile.brand };
  for (const key of ["name", "description", "website", "phone", "location", "language"] as const) {
    const value = result.fields[key]?.value;
    if (selected.includes(key) && value) {
      brand[key] = value;
      if (key === "phone" && value.startsWith("+")) brand.phoneCountry = "";
    }
  }
  if (selected.includes("channels")) {
    brand.channels = [...brand.channels];
    for (const channel of result.channels) {
      if (!brand.channels.some(item => item.handle.replace(/\/$/, "").toLowerCase() === channel.handle.replace(/\/$/, "").toLowerCase())) {
        brand.channels.push({ ...channel, id: `import-${brand.channels.length}-${channel.platform.toLowerCase()}` });
      }
    }
  }
  if (selected.includes("colors") && result.colors.length) brand.colors = [...result.colors];
  if (selected.includes("logo") && logo) { brand.logoUrl = logo.url; brand.logoStorageRef = logo.storageRef; }
  return { ...profile, brand };
}
