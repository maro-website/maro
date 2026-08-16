/**
 * Lightweight conflict detection + precedence for compiled briefs.
 *
 * Precedence (highest → lowest):
 * 1. Safety / technical restrictions
 * 2. Explicit user request
 * 3. maroFort selections (current generation)
 * 4. maroPreset defaults
 * 5. maroBrain preferences
 * 6. Prompt layers
 * 7. System prompt defaults
 */

import type { ConflictNote } from "./types";

const COLOR_KEYWORDS = {
  monochrome: /\b(black and white|monochrome|grayscale|bardh e zi|pa ngjyra)\b/i,
  vibrant: /\b(vibrant|colorful|bold color|ngjyra të forta|ngjyra te forta)\b/i,
};

export function detectBriefConflicts(input: {
  userPrompt: string;
  fortValues: Record<string, unknown>;
  presetPrompt?: string | null;
  brainContext?: string | null;
}): ConflictNote[] {
  const notes: ConflictNote[] = [];
  const user = input.userPrompt ?? "";
  const fortColor = String(input.fortValues.colorDirection ?? input.fortValues.colorPalette ?? "");

  if (COLOR_KEYWORDS.monochrome.test(user) && /vibrant|colorful|bold/i.test(fortColor)) {
    notes.push({
      kind: "color",
      message: "User prompt requests monochrome while maroFort color direction is vibrant.",
      resolution: "User request takes precedence over maroFort color direction for this generation.",
    });
  }

  if (COLOR_KEYWORDS.vibrant.test(user) && /monochrome|bw|black.?white/i.test(fortColor)) {
    notes.push({
      kind: "color",
      message: "User prompt requests vibrant color while maroFort suggests monochrome.",
      resolution: "User request takes precedence over maroFort color direction for this generation.",
    });
  }

  if (input.presetPrompt && COLOR_KEYWORDS.monochrome.test(user) && COLOR_KEYWORDS.vibrant.test(input.presetPrompt)) {
    notes.push({
      kind: "preset_color",
      message: "User prompt conflicts with preset color guidance.",
      resolution: "User request takes precedence over preset defaults.",
    });
  }

  if (input.brainContext && /\bno text\b/i.test(user) && /headline|text overlay/i.test(input.brainContext)) {
    notes.push({
      kind: "brain_text",
      message: "User requests no text but brain content references text usage.",
      resolution: "User request takes precedence; brain text preferences deferred.",
    });
  }

  return notes;
}

export const CONFLICT_PRECEDENCE_DOC = `
Safety/technical restrictions >
explicit user request >
explicit current-generation maroFort selections >
maroPreset defaults >
maroBrain preferences >
general Prompt Layers >
System Prompt defaults
`.trim();
