import type { PromptItem } from "@/lib/prompts/types";

/** Same permitted catalog as maroPresets; never embeds a private or stale preset. */
export function latestHubPresets(items: readonly PromptItem[]): PromptItem[] {
  const unique = new Map<string, PromptItem>();
  for (const item of items) if (item.featured_url && !unique.has(item.id)) unique.set(item.id, item);
  return [...unique.values()].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || b.id.localeCompare(a.id)).slice(0, 10);
}
