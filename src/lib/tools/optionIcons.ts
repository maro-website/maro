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
  optionId: string,
  theme: "qelt" | "mshelt"
): string | undefined {
  const set = icons?.[optionKey(toolId, settingId, optionId)];
  if (!set) return undefined;
  if (theme === "mshelt") return set.dark ?? set.light;
  return set.light ?? set.dark;
}
