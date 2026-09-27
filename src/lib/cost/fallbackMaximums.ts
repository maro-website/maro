/**
 * Internal provider cost ceilings per tool (EUR-equivalent USD).
 * Not user credit prices — used when provider usage is unknown (cost_source = fallback_maximum).
 */
const FALLBACK_MAX_USD: Record<string, number> = {
  reklama: 0.35,
  logo: 0.35,
  website: 2.5,
  filma: 0,
  zo: 0,
  marketing: 0,
};

const MODULE_ALIASES: Record<string, string> = {
  imazh: "reklama",
  maroimazh: "reklama",
  marologo: "logo",
  web: "website",
  maroweb: "website",
};

export function getProviderCostFallbackMaximumUsd(module: string): number {
  const key = MODULE_ALIASES[module.toLowerCase()] ?? module.toLowerCase();
  return FALLBACK_MAX_USD[key] ?? 0;
}
