/** Native Recraft API catalog, verified 2026-10-18. Raster aliases are not duplicate models.
 * https://www.recraft.ai/docs/api-reference/models/overview
 */
export const RECRAFT_MODELS = [
  { id: "recraftv4_1", label: "Recraft V4.1" },
  { id: "recraftv4_1_flash", label: "Recraft V4.1 Flash" },
  { id: "recraftv4_1_pro", label: "Recraft V4.1 Pro" },
  { id: "recraftv4_1_vector", label: "Recraft V4.1 Vector" },
  { id: "recraftv4_1_pro_vector", label: "Recraft V4.1 Pro Vector" },
  { id: "recraftv4_1_utility", label: "Recraft V4.1 Utility" },
  { id: "recraftv4_1_utility_pro", label: "Recraft V4.1 Utility Pro" },
  { id: "recraftv4", label: "Recraft V4" },
  { id: "recraftv4_pro", label: "Recraft V4 Pro" },
  { id: "recraftv4_vector", label: "Recraft V4 Vector" },
  { id: "recraftv4_pro_vector", label: "Recraft V4 Pro Vector" },
  { id: "recraftv4_styles", label: "Recraft V4 Styles" },
  { id: "recraftv4_styles_pro", label: "Recraft V4 Styles Pro" },
  { id: "recraftv4_styles_vector", label: "Recraft V4 Styles Vector" },
  { id: "recraftv4_styles_pro_vector", label: "Recraft V4 Styles Pro Vector" },
  { id: "recraftv3", label: "Recraft V3" },
  { id: "recraftv3_vector", label: "Recraft V3 Vector" },
  { id: "recraftv2", label: "Recraft V2" },
  { id: "recraftv2_vector", label: "Recraft V2 Vector" },
  { id: "recraftv4_1_utility_vector", label: "Recraft V4.1 Utility Vector" },
  { id: "recraftv4_1_utility_pro_vector", label: "Recraft V4.1 Utility Pro Vector" },
] as const;
export type RecraftModelId = typeof RECRAFT_MODELS[number]["id"];
export function isRecraftModel(value: unknown): value is RecraftModelId {
  return typeof value === "string" && RECRAFT_MODELS.some((model) => model.id === value);
}
export function canUseRecraft(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === "erzen@nice.al";
}
export function recraftPromptLimit(model: RecraftModelId) {
  return /^recraftv[23](?:_vector)?$/.test(model) ? 1000 : 10000;
}
