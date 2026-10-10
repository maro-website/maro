import type { ExploreItemExtended } from "./types";

export const EXPLORE_REMIX_KEY = "maro:remix";
export type ExploreRemix = { prompt: string; toolId: "reklama"; remixOf: string; imageUrl?: string };

/** The author's private prompt and settings must never enter a remix draft. */
export function buildExploreRemix(item: ExploreItemExtended): ExploreRemix {
  const publicPrompt = item.show_prompt !== false ? item.prompt?.trim() : "";
  return publicPrompt
    ? { prompt: publicPrompt, toolId: "reklama", remixOf: item.id }
    : { prompt: "maro", toolId: "reklama", remixOf: item.id, imageUrl: item.url };
}
