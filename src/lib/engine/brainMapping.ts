/**
 * maroBrain mapping — per-tool section isolation for the compiler.
 */

import {
  buildBrainBrief,
  buildMatchedSourcesBrief,
  matchSourcesByPrompt,
} from "@/lib/workspaces/brainProfile";
import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import type { BrainMappingConfig, EngineToolId } from "./types";
import { getEngineToolDefinition } from "./toolRegistry";

const SECTION_BUILDERS: Record<string, (p: WorkspaceBrainProfile) => string[]> = {
  brand: (p) => {
    const lines: string[] = [];
    if (p.brand.name) lines.push(`Brand: ${p.brand.name}`);
    if (p.brand.category) lines.push(`Category: ${p.brand.category}`);
    if (p.brand.description) lines.push(`About: ${p.brand.description}`);
    return lines;
  },
  target: (p) => {
    const lines: string[] = [];
    if (p.target.audience) lines.push(`Audience: ${p.target.audience}`);
    if (p.target.painPoints) lines.push(`Pain points: ${p.target.painPoints}`);
    return lines;
  },
  goal: (p) => {
    const lines: string[] = [];
    if (p.goal.primaryGoal) lines.push(`Primary goal: ${p.goal.primaryGoal}`);
    if (p.goal.secondaryGoals) lines.push(`Secondary goals: ${p.goal.secondaryGoals}`);
    return lines;
  },
  market: (p) => {
    const lines: string[] = [];
    if (p.market.region) lines.push(`Region: ${p.market.region}`);
    if (p.market.positioning) lines.push(`Positioning: ${p.market.positioning}`);
    return lines;
  },
  content: (p) => {
    const lines: string[] = [];
    if (p.content.tone) lines.push(`Tone: ${p.content.tone}`);
    if (p.content.voice) lines.push(`Voice: ${p.content.voice}`);
    if (p.content.avoid) lines.push(`Avoid: ${p.content.avoid}`);
    return lines;
  },
};

export function resolveBrainMapping(toolId: EngineToolId, override?: BrainMappingConfig): BrainMappingConfig {
  const def = getEngineToolDefinition(toolId);
  return {
    usesBrain: override?.usesBrain ?? def.usesBrain,
    allowedSections: override?.allowedSections ?? def.brainSections,
    maxContextTokens: override?.maxContextTokens,
    prioritySections: override?.prioritySections ?? def.brainSections.slice(0, 3),
  };
}

export function buildToolBrainContext(input: {
  toolId: EngineToolId;
  mapping: BrainMappingConfig;
  profile: WorkspaceBrainProfile | null | undefined;
  userPrompt: string;
  sources?: WorkspaceSource[];
}): { text: string; sectionsUsed: string[] } {
  if (!input.mapping.usesBrain || !input.profile) {
    return { text: "", sectionsUsed: [] };
  }

  const allowed = new Set(input.mapping.allowedSections);
  const ordered = [
    ...(input.mapping.prioritySections ?? []),
    ...input.mapping.allowedSections,
  ].filter((s, i, arr) => allowed.has(s) && arr.indexOf(s) === i);

  const lines: string[] = ["## maroBrain — workspace context"];
  const sectionsUsed: string[] = [];

  for (const section of ordered) {
    const builder = SECTION_BUILDERS[section];
    if (!builder) continue;
    const sectionLines = builder(input.profile).filter(Boolean);
    if (sectionLines.length) {
      sectionsUsed.push(section);
      lines.push(...sectionLines);
    }
  }

  if (lines.length <= 1) {
    const full = buildBrainBrief(input.profile);
    if (full.trim()) return { text: full, sectionsUsed: ["full"] };
    return { text: "", sectionsUsed: [] };
  }

  const sources = input.sources ?? [];
  const matched = matchSourcesByPrompt(input.userPrompt, sources);
  if (matched.length) {
    lines.push(buildMatchedSourcesBrief(matched));
    sectionsUsed.push("matched_sources");
  }

  return { text: lines.join("\n"), sectionsUsed };
}
