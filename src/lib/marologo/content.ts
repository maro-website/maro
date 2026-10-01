import { BRAND_TRAITS, CONCEPT_INTENTS, INDUSTRIES, LOGO_TYPES, PRESENTATION_MODES, TYPOGRAPHY_OPTIONS, VISUAL_STYLE_OPTIONS } from "./constants";
import { DEFAULT_WIZARD_STATE } from "./defaults";
import type { MaroLogoWizardState } from "./types";

type Choice = { value: string; label: string; description?: string };
export interface LogoContentField { label: string; help: string; placeholder: string; order: number; enabled: boolean; required: boolean; defaultValue: string; options: Array<{ value: string; label: string; description: string; order: number }> }
const field = (label: string, order: number, placeholder = "", options: readonly Choice[] = [], defaultValue = "", required = false): LogoContentField => ({ label, help: "", placeholder, order, enabled: true, required, defaultValue, options: options.map((v, i) => ({ value: v.value, label: v.label, description: v.description ?? "", order: i })) });
const choices = (values: readonly string[]) => values.map((value) => ({ value, label: value }));
/** Only the existing Wizard identities. Grouping, types and conditions remain code-owned. */
export const DEFAULT_LOGO_CONTENT = {
  "brand.name": field("Emri i brendit", 0, "p.sh. Luma", [], "", true),
  "brand.description": field("Çka bën brendi?", 1, "p.sh. Platformë SaaS që ua thjeshton financat bizneseve të vogla.", [], "", true),
  "brand.audience": field("Për kë është ky brend?", 0, "p.sh. Themelues jo-teknikë të bizneseve të vogla"),
  "brand.industry": field("Industria", 1, "Zgjedh…", choices(INDUSTRIES)),
  "brand.industryOther": field("Shkruaj industrinë", 0),
  "brand.slogan": field("Slogani", 2, "Opsionale"),
  "direction.traits": field("Personaliteti · deri në 3", 0, "", choices(BRAND_TRAITS)),
  "logo.type": field("Logo type", 1, "", LOGO_TYPES, "maro_decides"),
  "logo.conceptIntent": field("Çka duhet me udhëheq konceptin?", 2, "", CONCEPT_INTENTS, "maro_decides"),
  "look.visualStyle": field("Drejtimi vizual", 3, "", VISUAL_STYLE_OPTIONS, "maro_decides"),
  "logo.symbolMeaning": field("A ke një ide ose domethënie për simbolin?", 0, "p.sh. lidhje, shpejtësi, transformim — ose lëre Maron me vendos"),
  "look.typography": field("Tipografia", 1, "", TYPOGRAPHY_OPTIONS, "maro_decides"),
  "look.colors": field("Ngjyrat", 2, "#253FDA"),
  "references": field("Referenca", 5, "Drag & Drop ose kliko këtu"),
  "logo.mustInclude": field("Çka duhet patjetër me u përfshi?", 3, "Vetëm nëse është vërtet e domosdoshme"),
  "logo.avoid": field("Çka nuk don me pa?", 4, "p.sh. pa kulme shtëpish, pa AI sparkles"),
  "presentation.mode": field("Si don me e pa?", 0, "", PRESENTATION_MODES, "bento"),
} satisfies Record<string, LogoContentField>;
export type LogoFieldKey = keyof typeof DEFAULT_LOGO_CONTENT;
export type LogoContent = Record<LogoFieldKey, LogoContentField>;
export const OPTIONAL_LOGO_TEXT: LogoFieldKey[] = ["brand.audience", "brand.slogan", "logo.symbolMeaning", "logo.mustInclude", "logo.avoid"];
export const LOGO_FIELD_GROUPS: LogoFieldKey[][] = [["brand.name", "brand.description"], ["brand.audience", "brand.industry", "brand.slogan"], ["direction.traits", "logo.type", "logo.conceptIntent", "look.visualStyle"], ["logo.symbolMeaning", "look.typography", "look.colors", "logo.mustInclude", "logo.avoid", "references"]];
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("invalid_logo_content"); return v as Record<string, unknown>; };
const text = (v: unknown, max: number, nonempty = false) => { if (typeof v !== "string" || v.length > max || (nonempty && !v.trim())) throw new Error("invalid_logo_content"); return v; };
const order = (v: unknown) => { if (!Number.isSafeInteger(v) || Number(v) < 0 || Number(v) > 1000) throw new Error("invalid_logo_order"); return v as number; };
function exactKeys(v: Record<string, unknown>, keys: string[]) { if (Object.keys(v).length !== keys.length || Object.keys(v).some((k) => !keys.includes(k))) throw new Error("invalid_logo_content_keys"); }
export function validateLogoContent(value: unknown): LogoContent {
  const input = object(value); exactKeys(input, Object.keys(DEFAULT_LOGO_CONTENT));
  const result = {} as LogoContent;
  for (const key of Object.keys(DEFAULT_LOGO_CONTENT) as LogoFieldKey[]) {
    const f = object(input[key]); const base = DEFAULT_LOGO_CONTENT[key]; exactKeys(f, Object.keys(base));
    if (typeof f.enabled !== "boolean" || typeof f.required !== "boolean") throw new Error("invalid_logo_behavior");
    if (!OPTIONAL_LOGO_TEXT.includes(key) && (f.enabled !== base.enabled || f.required !== base.required)) throw new Error("fixed_logo_contract");
    if (!f.enabled && f.required) throw new Error("hidden_required_field");
    if (!Array.isArray(f.options) || f.options.length !== base.options.length) throw new Error("invalid_logo_options");
    const options = f.options.map((value) => { const opt = object(value); exactKeys(opt, ["value", "label", "description", "order"]);
      if (!base.options.some((o) => o.value === opt.value)) throw new Error("invalid_logo_option_identity");
      return { value: String(opt.value), label: text(opt.label, 160, true), description: text(opt.description, 500), order: order(opt.order) };
    });
    if (new Set(options.map((o) => o.value)).size !== options.length) throw new Error("duplicate_logo_option");
    const defaultValue = text(f.defaultValue, 160);
    // Text/multiselect/industry keep their neutral default. Existing single choices may change.
    if (base.defaultValue ? !options.some((o) => o.value === defaultValue) : defaultValue !== "") throw new Error("invalid_logo_default");
    result[key] = { label: text(f.label, 160, true), help: text(f.help, 700), placeholder: text(f.placeholder, 500), order: order(f.order), enabled: f.enabled, required: f.required, defaultValue, options };
  }
  return result;
}
export function logoOptions(content: LogoContent, key: LogoFieldKey) { return [...content[key].options].sort((a, b) => a.order - b.order || a.value.localeCompare(b.value)); }
export function orderedLogoKeys(content: LogoContent, keys: LogoFieldKey[]) { return [...keys].filter((k) => content[k].enabled).sort((a, b) => content[a].order - content[b].order || a.localeCompare(b)); }
export function logoInitialState(content: LogoContent): MaroLogoWizardState {
  const state = structuredClone(DEFAULT_WIZARD_STATE);
  for (const key of Object.keys(content) as LogoFieldKey[]) if (content[key].defaultValue) { const [group, name] = key.split("."); (state[group as keyof MaroLogoWizardState] as unknown as Record<string, unknown>)[name] = content[key].defaultValue; }
  return state;
}
export function logoContentAnswerErrors(state: MaroLogoWizardState, content: LogoContent): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of OPTIONAL_LOGO_TEXT) { const [group, name] = key.split("."); const value = (state[group as keyof MaroLogoWizardState] as unknown as Record<string, string>)[name].trim();
    if (!content[key].enabled && value) errors[name] = `${content[key].label}: nuk është në dispozicion.`;
    if (content[key].required && !value) errors[name] = `${content[key].label}: kërkohet përgjigje.`;
  }
  return errors;
}
