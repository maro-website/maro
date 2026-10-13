/** Private live beta. Expand this gate only after the owner approves public rollout. */
export function canUseMoods(email?: string | null): boolean {
  return email?.trim().toLowerCase() === "erzen@nice.al";
}

export const MOOD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type Mood = {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  sort_order: number;
  saved: boolean;
};
export type AdminMood = Omit<Mood, "saved"> & {
  prompt: string;
  active: boolean;
  updated_at: string;
};

export const MOOD_PRESERVATION = "Apply this mood as a thematic layer to the complete existing concept, including the user's request, preset, brand context and attached references. Preserve the core idea and composition. Preserve the product's identity, shape, packaging, colors, branding, logo and all original label text exactly. Do not redesign, relabel, replace, obscure or add decorations over the product or its label. Adapt the surrounding scenery, props, lighting and atmosphere to the mood. Any new decorative text must follow the selected text setting. Original product and label text must remain intact even when new text is disabled.";

export function moodPromptSection(prompt: string): string {
  return `MARO MOOD — THEMATIC DIRECTION:\n${prompt.trim()}\n\nPRODUCT AND CONCEPT PRESERVATION:\n${MOOD_PRESERVATION}`;
}
