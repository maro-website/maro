"use client";

import { StorageKeys, readJSON, writeJSON } from "@/lib/storage/local";
import {
  defaultSelections,
  findOption,
  getTool,
  type ToolDef,
  type ToolSelections,
} from "@/lib/tools/registry";

type AllSelections = Record<string, ToolSelections>;

// Read the persisted selections for a tool, falling back to defaults. Each tool
// keeps its own last-used settings so switching between Logo/Reklama/Web keeps
// each one's choices independent.
export function loadToolSelections(tool: ToolDef): ToolSelections {
  const all = readJSON<AllSelections>(StorageKeys.toolSelections, {});
  const saved = all[tool.id] ?? {};
  const base = defaultSelections(tool);
  for (const s of tool.settings) {
    const savedOpt = saved[s.id];
    // Only accept a saved option that still exists and is available.
    if (savedOpt) {
      const opt = findOption(s, savedOpt);
      if (opt && opt.available !== false) base[s.id] = savedOpt;
    }
  }
  return base;
}

export function saveToolSelections(toolId: string, selections: ToolSelections): void {
  const all = readJSON<AllSelections>(StorageKeys.toolSelections, {});
  all[toolId] = selections;
  writeJSON(StorageKeys.toolSelections, all);
}

// The last tool the user actively used (for the Hub prompt box default).
export function loadLastTool(): ToolDef | undefined {
  const all = readJSON<AllSelections>(StorageKeys.toolSelections, {});
  const id = (all.__last as unknown as string) || "";
  return getTool(id);
}

export function saveLastTool(toolId: string): void {
  const all = readJSON<AllSelections>(StorageKeys.toolSelections, {});
  (all as Record<string, unknown>).__last = toolId;
  writeJSON(StorageKeys.toolSelections, all);
}
