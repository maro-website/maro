import { optionKey } from "@/lib/tools/registry";

/** Public SVG assets shipped with the app (Figma export). */
export const ICONS_BASE = "/icons";

/** Tool cards in sidebar grid — keyed by registry tool id. */
export const TOOL_ICON_FILES: Partial<Record<string, string>> = {
  reklama: "maroImazh.svg",
  logo: "maroLogo.svg",
  website: "maroImazh.svg",
  filma: "maroFilma.svg",
  zo: "maroZo.svg",
  prompte: "bulb (1).svg",
};

/** Per-option icons — keyed by optionKey (`tool.setting.option`). */
export const OPTION_ICON_FILES: Record<string, string> = {
  "reklama.model.gpt-image-2": "chatgpt.svg",
  "reklama.text.off": "teksti.svg",
  "reklama.text.on": "teksti.svg",
  "logo.model.gpt-image-2": "chatgpt.svg",
  "website.model.opus-4-8": "chatgpt.svg",
  "website.model.opus-5": "chatgpt.svg",
  "reklama.format.ig-post": "formati or size.svg",
  "reklama.format.ig-story": "formati or size.svg",
  "reklama.format.fb-post": "formati or size.svg",
  "reklama.format.yt-thumb": "formati or size.svg",
  "reklama.speed.kadale": "speed.svg",
  "reklama.speed.normal": "speed.svg",
  "reklama.speed.fast": "speed.svg",
  "logo.speed.kadale": "speed.svg",
  "logo.speed.normal": "speed.svg",
  "logo.speed.fast": "speed.svg",
  "website.speed.kadale": "speed.svg",
  "website.speed.normal": "speed.svg",
  "website.speed.fast": "speed.svg",
};

/** Chrome / shell icons (header, menu, prompt dock). */
export const UI_ICON_FILES = {
  attach: "attach.svg",
  fullscreen: "fullscreen.svg",
  coins: "coins (1).svg",
  wallet: "wallet.svg",
  notification: "notification.svg",
  generate: "maro-generate.svg",
  dropdown: "dropdown.svg",
  dropdownSelect: "dropdown-select.svg",
  lock: "lock (1).svg",
  maroFort: "maroFort.svg",
  history: "time-past.svg",
  prompts: "bulb (1).svg",
  admin: "admin.svg",
  user: "user (3).svg",
  settings: "cilesimet.svg",
  logout: "dil.svg",
  save: "save.svg",
  creator: "maroKreator.svg",
  sidebarFlip: "sidebar-flip.svg",
  tekst: "teksti.svg",
  toolActive: "maroImazh (2).svg",
} as const;

export type UiIconKey = keyof typeof UI_ICON_FILES;

export function iconSrc(file: string): string {
  return `${ICONS_BASE}/${encodeURI(file)}`;
}

export function toolIconSrc(toolId: string): string | undefined {
  const file = TOOL_ICON_FILES[toolId];
  return file ? iconSrc(file) : undefined;
}

export function staticOptionIconSrc(
  toolId: string,
  settingId: string,
  optionId: string
): string | undefined {
  const file = OPTION_ICON_FILES[optionKey(toolId, settingId, optionId)];
  return file ? iconSrc(file) : undefined;
}

export function uiIconSrc(key: UiIconKey): string {
  return iconSrc(UI_ICON_FILES[key]);
}
