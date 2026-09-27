/**
 * maroWeb content-language resolution and locale-neutrality policy.
 * Shared by legacy HTML generation and Engine compiler paths.
 */

import type { LanguageCode } from "@/lib/types";

/** No explicit user/brand language — do not inject a contradictory directive. */
export const WEB_LANGUAGE_AUTO = "auto" as const;

export type WebStructuredLanguage = LanguageCode | typeof WEB_LANGUAGE_AUTO;

export type WebContentLanguageCode = LanguageCode;

export type WebLanguageSource = "structured" | "prompt" | "brand" | "auto";

export interface WebLanguageResolution {
  /** Effective language code, or auto when none should be forced. */
  code: WebContentLanguageCode | typeof WEB_LANGUAGE_AUTO;
  source: WebLanguageSource;
  /** When true, inject "All user-facing copy must be in …" / BUSINESS DETAILS language line. */
  injectDirective: boolean;
}

const EXPLICIT_STRUCTURED = new Set<string>(["sq", "en", "de"]);

export function isExplicitStructuredLanguage(
  language: string | undefined | null
): language is LanguageCode {
  return Boolean(language && language !== WEB_LANGUAGE_AUTO && EXPLICIT_STRUCTURED.has(language));
}

const PROMPT_LANGUAGE_PATTERNS: Array<{ code: LanguageCode; re: RegExp }> = [
  { code: "en", re: /\bcontent\s+in\s+english\b/i },
  { code: "en", re: /\b(?:write|website|site|copy)\s+(?:the\s+)?(?:website\s+|site\s+|copy\s+|content\s+)?in\s+english\b/i },
  { code: "en", re: /\bin\s+english\b/i },
  { code: "de", re: /\bcontent\s+in\s+german\b/i },
  { code: "de", re: /\b(?:write|website|site|copy)\s+(?:the\s+)?(?:website\s+|site\s+|copy\s+|content\s+)?in\s+german\b/i },
  { code: "de", re: /\bin\s+german\b/i },
  { code: "sq", re: /\bcontent\s+in\s+albanian\b/i },
  { code: "sq", re: /\b(?:write|website|site|copy)\s+(?:the\s+)?(?:website\s+|site\s+|copy\s+|content\s+)?in\s+albanian\b/i },
  { code: "sq", re: /\bn[ëe]\s+shqip\b/i },
  { code: "sq", re: /\bgjuh[ëe]n\s+shqipe\b/i },
];

/** Detect obvious explicit language instructions in free-text prompts. */
export function detectPromptLanguageInstruction(
  userPrompt: string | undefined | null
): LanguageCode | null {
  const text = userPrompt?.trim();
  if (!text) return null;
  for (const { code, re } of PROMPT_LANGUAGE_PATTERNS) {
    if (re.test(text)) return code;
  }
  return null;
}

export interface ResolveWebContentLanguageInput {
  /** Structured language from request/project (may be auto). */
  structuredLanguage?: string | null;
  userPrompt?: string | null;
  /** Future: trusted business/brand language from maroBrain. */
  brandLanguage?: string | null;
}

/**
 * maroWeb language precedence:
 * 1. explicit structured language selected by the user (sq/en/de — not auto)
 * 2. explicit language instruction in the user prompt
 * 3. explicit trusted business/brand language
 * 4. auto — follow the user's request naturally; do not inject opposing directives
 */
export function resolveWebContentLanguage(
  input: ResolveWebContentLanguageInput
): WebLanguageResolution {
  if (isExplicitStructuredLanguage(input.structuredLanguage)) {
    return {
      code: input.structuredLanguage,
      source: "structured",
      injectDirective: true,
    };
  }

  const fromPrompt = detectPromptLanguageInstruction(input.userPrompt);
  if (fromPrompt) {
    return { code: fromPrompt, source: "prompt", injectDirective: true };
  }

  if (isExplicitStructuredLanguage(input.brandLanguage)) {
    return {
      code: input.brandLanguage,
      source: "brand",
      injectDirective: true,
    };
  }

  return { code: WEB_LANGUAGE_AUTO, source: "auto", injectDirective: false };
}

export function langDisplayName(code: WebContentLanguageCode): string {
  if (code === "en") return "English";
  if (code === "de") return "German";
  return "Albanian (Shqip)";
}

/** Reusable locale-neutrality policy for maroWeb HTML output contracts. */
export const WEB_LOCALE_NEUTRALITY_POLICY = `LOCALE RULES (unless the user or trusted business context explicitly supplies country, city, currency, phone format, or address):
Do not infer or invent a specific country, city, currency, phone country code, address format, or domain extension from the output language, Maro UI language, maro.al domain, Maro's origin, or Albanian-speaking audiences.
If fictional placeholder business details are needed, keep them geographically neutral.
Language and geography are independent.`;

export function buildWebLanguageDirective(resolution: WebLanguageResolution): string {
  if (resolution.injectDirective && resolution.code !== WEB_LANGUAGE_AUTO) {
    return `All user-facing copy must be in ${langDisplayName(resolution.code)}.`;
  }
  return `Write all user-facing copy in the language the user requested, or match the language of the user's request naturally. Do not contradict an explicit language instruction in the user request.`;
}
