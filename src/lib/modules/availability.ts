/** Product release policy. Database settings and client payloads cannot enable future modules. */
export const MODULE_AVAILABILITY = {
  imazh: { name: "maroImazh", status: "live", version: "V1", generation: true },
  logo: { name: "maroLogo", status: "live", version: "V1", generation: true },
  brain: { name: "maroBrain", status: "live", version: "V1", generation: false },
  presets: { name: "maroPresets", status: "live", version: "V1", generation: false },
  web: { name: "maroWeb", status: "coming_soon", version: "V1.5", generation: false },
  filma: { name: "maroFilma", status: "coming_soon", version: "V2", generation: false },
  audio: { name: "maroAudio", status: "coming_soon", version: "V2", generation: false },
  marketing: { name: "maroMarketing", status: "coming_soon", version: "V2", generation: false },
  fort: { name: "maroFort", status: "parked", version: "V2", generation: false },
  chat: { name: "maroChat", status: "parked", version: "V2", generation: false },
} as const;

export type ProductModuleId = keyof typeof MODULE_AVAILABILITY;

const ALIASES: Readonly<Record<string, ProductModuleId>> = {
  imazh: "imazh", reklama: "imazh", image: "imazh", maro_imazh: "imazh", maroimazh: "imazh",
  logo: "logo", maro_logo: "logo", marologo: "logo",
  brain: "brain", brand: "brain", maro_brain: "brain", marobrain: "brain",
  presets: "presets", prompts: "presets", prompte: "presets", maropresets: "presets",
  web: "web", website: "web", maro_web: "web", maroweb: "web", edit: "web", "edit-html": "web",
  filma: "filma", video: "filma", maro_filma: "filma", marofilma: "filma",
  audio: "audio", zo: "audio", maro_zo: "audio", maro_audio: "audio", marozo: "audio", maroaudio: "audio",
  marketing: "marketing", maro_marketing: "marketing", maromarketing: "marketing",
  fort: "fort", maro_fort: "fort", marofort: "fort",
  chat: "chat", fjale: "chat", maro_chat: "chat", marochat: "chat",
};

export function resolveProductModule(value: unknown): ProductModuleId | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(ALIASES, key) ? ALIASES[key] : null;
}

export function getModuleAvailability(value: unknown) {
  const id = resolveProductModule(value);
  return id ? MODULE_AVAILABILITY[id] : null;
}

export function isModuleLive(value: unknown): boolean {
  return getModuleAvailability(value)?.status === "live";
}

/** Compatibility projection for existing UI and Engine registries. */
export function moduleAvailabilityFlags(value: unknown) {
  const productModule = getModuleAvailability(value);
  return {
    functional: productModule?.status === "live",
    comingSoon: productModule?.status === "coming_soon",
  };
}

export function generationAvailabilityError(value: unknown) {
  const id = resolveProductModule(value);
  if (!id) return { error: "unknown_module", status: 400 as const };
  const productModule = MODULE_AVAILABILITY[id];
  if (productModule.generation) return null;
  return {
    error: productModule.status === "live" ? "module_not_generator" : "module_unavailable",
    status: 403 as const,
    module: id,
    targetVersion: productModule.version,
  };
}
