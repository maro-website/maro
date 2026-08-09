import { optionKey } from "@/lib/tools/registry";
import { MARO_ICONS } from "@/lib/design/maro-system";

/** Public SVG assets — canonical maro-design-system/icons (synced to public/icons). */
export const ICONS_BASE = MARO_ICONS.base;

/** Tool cards in sidebar grid — keyed by registry tool id. */
export const TOOL_ICON_FILES: Partial<Record<string, string>> = {
  reklama: "maro-imazh.svg",
  logo: "maro-brand.svg",
  website: "maro-web.svg",
  filma: "maro-filma.svg",
  zo: "maro-zo.svg",
  prompte: "idea.svg",
  plan: "idea.svg",
};

/** Per-option icons — keyed by optionKey (`tool.setting.option`). */
export const OPTION_ICON_FILES: Record<string, string> = {
  "reklama.model.gpt-image-2": "chatgpt.svg",
  "reklama.text.off": "text.svg",
  "reklama.text.on": "text.svg",
  "logo.model.gpt-image-2": "chatgpt.svg",
  "website.model.opus-4-8": "chatgpt.svg",
  "website.model.opus-5": "chatgpt.svg",
  "reklama.format.ig-post": "aspect-ratio.svg",
  "reklama.format.ig-story": "aspect-ratio.svg",
  "reklama.format.fb-post": "aspect-ratio.svg",
  "reklama.format.yt-thumb": "aspect-ratio.svg",
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
  coins: "credits.svg",
  wallet: "wallet.svg",
  notification: "notification.svg",
  generate: "generate.svg",
  dropdown: "dropdown-control.svg",
  dropdownSelect: "select.svg",
  lock: "lock.svg",
  maroFort: "maro-fort.svg",
  history: "history.svg",
  prompts: "idea.svg",
  admin: "admin.svg",
  user: "user.svg",
  settings: "settings.svg",
  logout: "logout.svg",
  save: "save.svg",
  creator: "maro-kreator.svg",
  sidebarFlip: "sidebar-toggle.svg",
  tekst: "text.svg",
  toolActive: "maro-imazh.svg",
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
