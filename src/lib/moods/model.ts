/** Private live beta. Expand this gate only after the owner approves public rollout. */
export function canUseMoods(email?: string | null): boolean {
  return email?.trim().toLowerCase() === "erzen@nice.al";
}

export const MOOD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const STYLE_TITLE_LIMIT = 40;
export const STYLE_INPUT_LIMIT = 1600;
export type MoodStatus = "processing" | "pending" | "approved" | "rejected" | "failed";
export type MoodVisibility = "public" | "private";
export type Mood = {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  sort_order: number;
  saved: boolean;
  created_by?: string | null;
  publisher_name?: string;
  source?: "platform" | "community";
  visibility?: MoodVisibility;
  status?: MoodStatus;
  input_text?: string;
  cover_ref?: string | null;
  rejection_reason?: string | null;
  updated_at?: string;
};
export type AdminMood = Omit<Mood, "saved"> & {
  active: boolean;
  updated_at: string;
  /** Read-only; returned only by the authorized admin listing. */
  generated_prompt?: string | null;
};

export function canUseMood(mood: Pick<Mood, "created_by" | "visibility" | "status"> & { active?: boolean }, userId: string) {
  return mood.active === true && mood.status === "approved" && (mood.visibility === "public" || mood.created_by === userId);
}

export const STYLE_STATUS_LABELS: Record<MoodStatus, string> = {
  processing: "Duke përgatitur", pending: "Në pritje të aprovimit", approved: "Aprovuar", rejected: "Refuzuar", failed: "Përgatitja dështoi",
};

export const MOOD_PRESERVATION = "Apply this mood as a thematic layer to the complete existing concept, including the user's request, preset, brand context and attached references. Preserve the core idea and composition. Preserve the product's identity, shape, packaging, colors, branding, logo and all original label text exactly. Do not redesign, relabel, replace, obscure or add decorations over the product or its label. Adapt the surrounding scenery, props, lighting and atmosphere to the mood. Any new decorative text must follow the selected text setting. Original product and label text must remain intact even when new text is disabled.";

export function moodPromptSection(prompt: string): string {
  return `MARO MOOD — THEMATIC DIRECTION:\n${prompt.trim()}\n\nPRODUCT AND CONCEPT PRESERVATION:\n${MOOD_PRESERVATION}`;
}
