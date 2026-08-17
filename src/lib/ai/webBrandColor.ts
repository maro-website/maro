/**
 * maroWeb client brand-color resolution.
 * Product Maro UI colors must never masquerade as customer brand intent.
 * Shared by legacy HTML generation and Engine compiler paths; pattern reusable
 * for future Engine modules (e.g. maroImazh palette isolation).
 */

/** Maro product UI accent — editor chrome only, never a generation fallback. */
export const MARO_UI_BRAND_COLOR = "#253FDA";

export type WebBrandColorSource = "user" | "brain" | "preset";

export interface WebBrandColorResolution {
  /** Authoritative customer hex when explicitly supplied. */
  color?: string;
  source?: WebBrandColorSource;
  /** When true, emit Brand color line + bind HTML palette rule to this hex. */
  injectDirective: boolean;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** True when a non-empty hex was explicitly supplied for customer branding. */
export function isExplicitClientBrandColor(color: string | undefined | null): color is string {
  return Boolean(color?.trim() && HEX_RE.test(color.trim()));
}

export interface ResolveWebBrandColorInput {
  /** Structured color from request/project/Fort. */
  userColor?: string | null;
  /** Future: trusted maroBrain/business palette. */
  brainColor?: string | null;
  /** Future: explicit preset/reference palette. */
  presetColor?: string | null;
}

/**
 * Customer brand-color precedence:
 * 1. explicit user color
 * 2. explicit maroBrain/business palette
 * 3. explicit preset/reference palette
 * 4. none → model chooses palette from brief (no Maro UI fallback)
 */
export function resolveWebBrandColor(input: ResolveWebBrandColorInput): WebBrandColorResolution {
  if (isExplicitClientBrandColor(input.userColor)) {
    return { color: input.userColor.trim(), source: "user", injectDirective: true };
  }
  if (isExplicitClientBrandColor(input.brainColor)) {
    return { color: input.brainColor.trim(), source: "brain", injectDirective: true };
  }
  if (isExplicitClientBrandColor(input.presetColor)) {
    return { color: input.presetColor.trim(), source: "preset", injectDirective: true };
  }
  return { injectDirective: false };
}

/** BUSINESS DETAILS brand-color line — omitted when no explicit customer color. */
export function webBusinessBrandColorLine(resolution: WebBrandColorResolution): string {
  if (!resolution.injectDirective || !resolution.color) return "";
  return `- Brand color: ${resolution.color}\n`;
}

export function resolveWebBrandColorFromRequest(input: {
  primaryColor?: string | null;
  brainBrandColor?: string | null;
  presetBrandColor?: string | null;
}): WebBrandColorResolution {
  return resolveWebBrandColor({
    userColor: input.primaryColor,
    brainColor: input.brainBrandColor,
    presetColor: input.presetBrandColor,
  });
}

/**
 * Invariant: Maro product visual identity must not be silently interpreted as
 * customer brand identity. UI theme fallbacks stay in the editor; generation
 * prompts only carry explicitly supplied client brand colors.
 */
export const CLIENT_BRAND_ISOLATION_INVARIANT =
  "Maro product UI colors are not customer brand colors unless explicitly supplied by the user or trusted business context.";

export function buildWebBrandColorHtmlRule(resolution: WebBrandColorResolution): string {
  if (resolution.injectDirective && resolution.color) {
    return `8. Keep the primary brand color close to ${resolution.color}; build a coherent palette around it.`;
  }
  return "8. Choose a coherent palette appropriate to the business and visual direction in the user's request.";
}
