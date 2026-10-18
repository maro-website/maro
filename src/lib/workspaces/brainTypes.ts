export type BrainTabId = "brand" | "target" | "goal" | "market" | "content" | "sources";

export type SalesChannel = "ONLINE" | "FIZIKISHT" | "HYBRID" | "";

export interface BrainChannel {
  id: string;
  platform: string;
  handle: string;
}

export interface BrainBrandSection {
  name: string;
  category: string;
  website: string;
  phoneCountry: string;
  phone: string;
  description: string;
  location: string;
  language: string;
  businessModel: string;
  salesChannel: SalesChannel;
  logoUrl: string | null;
  /** Stable private object identity when the logo is uploaded to Maro storage. */
  logoStorageRef?: string | null;
  logoBackdrop?: "auto" | "light" | "dark";
  /** Set only after an explicitly applied Fetch Brand import. */
  fetchBrandImportedAt?: string;
  channels: BrainChannel[];
  /** Optional, user-approved palette imported by the private Fetch Brand pilot. */
  colors?: string[];
  offering?: string;
  mission?: string;
  values?: string;
}

export interface BrainTargetSection {
  audience: string;
  demographics: string;
  interests: string;
  painPoints: string;
  buyingTriggers?: string;
  objections?: string;
}

export interface BrainGoalSection {
  primaryGoal: string;
  secondaryGoals: string;
  successMetrics: string;
  timeframe?: string;
}

export interface BrainMarketSection {
  region: string;
  competitors: string;
  positioning: string;
  differentiators: string;
  pricing?: string;
  proof?: string;
}

export interface BrainContentSection {
  tone: string;
  voice: string;
  themes: string;
  avoid: string;
  hashtags: string;
  cta?: string;
  examples?: string;
}

export interface WorkspaceBrainProfile {
  brand: BrainBrandSection;
  target: BrainTargetSection;
  goal: BrainGoalSection;
  market: BrainMarketSection;
  content: BrainContentSection;
}

export interface WorkspaceSource {
  id: string;
  workspaceId: string;
  name: string;
  /** Comma-separated keywords used to match user prompts. */
  keywords: string;
  fileUrl: string;
  storageRef?: string;
  mimeType?: string | null;
  folderId?: string | null;
  createdAt: string;
}

export interface BrainSourceFolder { id: string; name: string; }

export const BRAIN_TABS: { id: BrainTabId; label: string }[] = [
  { id: "brand", label: "Brendi" },
  { id: "target", label: "Targeti" },
  { id: "goal", label: "Goal" },
  { id: "market", label: "Market" },
  { id: "content", label: "Kontenti" },
  { id: "sources", label: "Burimet" },
];

export const BRAIN_CATEGORIES = [
  "Automotive",
  "Food & Beverage",
  "Retail",
  "Technology",
  "Healthcare",
  "Real Estate",
  "Fashion",
  "Other",
] as const;

export const BRAIN_BUSINESS_MODELS = [
  "Business to Business B2B",
  "Business to Consumer B2C",
  "Business to Business to Consumer B2B2C",
] as const;

export function emptyBrainProfile(): WorkspaceBrainProfile {
  return {
    brand: {
      name: "",
      category: "",
      website: "",
      phoneCountry: "+383",
      phone: "",
      description: "",
      location: "",
      language: "Shqip",
      businessModel: "",
      salesChannel: "",
      logoUrl: null,
      channels: [],
    },
    target: {
      audience: "",
      demographics: "",
      interests: "",
      painPoints: "",
    },
    goal: {
      primaryGoal: "",
      secondaryGoals: "",
      successMetrics: "",
    },
    market: {
      region: "",
      competitors: "",
      positioning: "",
      differentiators: "",
    },
    content: {
      tone: "",
      voice: "",
      themes: "",
      avoid: "",
      hashtags: "",
    },
  };
}
