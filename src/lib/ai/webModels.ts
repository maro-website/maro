/** Maps maro Web model selector ids → Anthropic (or future provider) API model ids. */
export const WEB_MODEL_API: Record<string, string> = {
  "opus-4-8": "claude-opus-4-8",
  "opus-5": "claude-opus-5",
};

export function resolveWebModel(optionId?: string): string {
  if (optionId && WEB_MODEL_API[optionId]) return WEB_MODEL_API[optionId];
  return process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
}
