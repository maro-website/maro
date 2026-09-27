import { optionKey } from "@/lib/tools/registry";

/** Admin-uploaded SVG URLs keyed by `${toolId}.${settingId}.${optionId}`. */
export type ToolOptionIconSet = {
  light?: string;
  dark?: string;
};

export type ToolOptionIcons = Record<string, ToolOptionIconSet>;

export function resolveOptionIconUrl(
  icons: ToolOptionIcons | undefined,
  toolId: string,
  settingId: string,
  optionId: string
): string | undefined {
  const set = icons?.[optionKey(toolId, settingId, optionId)];
  if (!set) return undefined;
  return set.dark ?? set.light;
}
