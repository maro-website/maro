/**
 * Maro Engine tool registry — canonical Engine IDs with legacy adapters.
 * Tool existence is code-defined; Admin manages configuration only.
 */

import { getTool, type ToolId } from "@/lib/tools/registry";
import { isModuleLive, moduleAvailabilityFlags } from "@/lib/modules/availability";
import type { EngineToolId, RegisteredEngineTool, RegistryToolId } from "./types";

export interface EngineToolDefinition {
  id: EngineToolId;
  displayName: string;
  registryToolId: RegistryToolId;
  /** Additional legacy ids that resolve to this engine tool. */
  legacyIds: string[];
  route: string;
  usesBrain: boolean;
  usesFort: boolean;
  presetSupport: boolean;
  functional: boolean;
  comingSoon: boolean;
  brainSections: string[];
}

export const ENGINE_TOOL_DEFINITIONS: EngineToolDefinition[] = [
  {
    id: "maro_imazh",
    displayName: "maro Imazh",
    registryToolId: "reklama",
    legacyIds: ["reklama", "imazh", "maroImazh"],
    route: "/imazh",
    usesBrain: true,
    usesFort: true,
    presetSupport: true,
    ...moduleAvailabilityFlags("imazh"),
    brainSections: ["brand", "target", "content", "goal"],
  },
  {
    id: "maro_logo",
    displayName: "maroLogo",
    registryToolId: "logo",
    legacyIds: ["logo", "maroLogo"],
    route: "/marologo",
    usesBrain: false,
    usesFort: true,
    presetSupport: true,
    ...moduleAvailabilityFlags("logo"),
    brainSections: [],
  },
  {
    id: "maro_web",
    displayName: "maro Web",
    registryToolId: "website",
    legacyIds: ["website", "web", "maroWeb"],
    route: "/web",
    usesBrain: true,
    usesFort: true,
    presetSupport: true,
    ...moduleAvailabilityFlags("web"),
    brainSections: ["brand", "target", "goal", "market", "content"],
  },
  {
    id: "maro_filma",
    displayName: "maro Filma",
    registryToolId: "filma",
    legacyIds: ["filma", "maroFilma"],
    route: "/filma",
    usesBrain: false,
    usesFort: false,
    presetSupport: false,
    ...moduleAvailabilityFlags("filma"),
    brainSections: [],
  },
  {
    id: "maro_zo",
    displayName: "maro Audio",
    registryToolId: "zo",
    legacyIds: ["zo", "audio", "maroZo"],
    route: "/audio",
    usesBrain: false,
    usesFort: false,
    presetSupport: false,
    ...moduleAvailabilityFlags("audio"),
    brainSections: [],
  },
  {
    id: "maro_marketing",
    displayName: "maroMarketing",
    registryToolId: "marketing",
    legacyIds: ["marketing", "maroMarketing"],
    route: "/marketing",
    usesBrain: true,
    usesFort: true,
    presetSupport: true,
    ...moduleAvailabilityFlags("marketing"),
    brainSections: ["brand", "target", "goal", "content"],
  },
];

const LEGACY_TO_ENGINE = new Map<string, EngineToolId>();
for (const def of ENGINE_TOOL_DEFINITIONS) {
  LEGACY_TO_ENGINE.set(def.id, def.id);
  LEGACY_TO_ENGINE.set(def.registryToolId, def.id);
  for (const legacy of def.legacyIds) LEGACY_TO_ENGINE.set(legacy, def.id);
}

export function isEngineToolId(value: string): value is EngineToolId {
  return ENGINE_TOOL_DEFINITIONS.some((d) => d.id === value);
}

/** Resolve any legacy or canonical id to EngineToolId. */
export function resolveEngineToolId(value: string | null | undefined): EngineToolId | null {
  if (!value) return null;
  const key = value.trim();
  return LEGACY_TO_ENGINE.get(key) ?? LEGACY_TO_ENGINE.get(key.toLowerCase()) ?? null;
}

export function getEngineToolDefinition(id: EngineToolId): EngineToolDefinition {
  const def = ENGINE_TOOL_DEFINITIONS.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown engine tool: ${id}`);
  return def;
}

export function getRegistryToolId(engineId: EngineToolId): RegistryToolId {
  return getEngineToolDefinition(engineId).registryToolId;
}

export function toRegisteredEngineTool(
  def: EngineToolDefinition,
  overrides?: Partial<RegisteredEngineTool>
): RegisteredEngineTool {
  const registryTool = getTool(def.registryToolId as ToolId);
  return {
    toolId: def.id,
    displayName: def.displayName,
    registryToolId: def.registryToolId,
    legacyRegistryId: def.registryToolId,
    route: def.route,
    productionPipeline: "legacy",
    defaultModelId: registryTool?.settings.find((s) => s.id === "model")?.default ?? null,
    usesBrain: def.usesBrain,
    presetSupport: def.presetSupport,
    brainMapping: {
      usesBrain: def.usesBrain,
      allowedSections: def.brainSections,
      prioritySections: def.brainSections.slice(0, 3),
    },
    metadata: {},
    ...overrides,
    ...moduleAvailabilityFlags(def.id),
    status: def.functional ? (overrides?.status ?? "active") : "coming_soon",
    usesFort: def.usesFort && isModuleLive("fort"),
  };
}

export function listRegisteredEngineTools(
  dbConfigs?: Map<EngineToolId, Partial<RegisteredEngineTool>>
): RegisteredEngineTool[] {
  return ENGINE_TOOL_DEFINITIONS.map((def) => {
    const db = dbConfigs?.get(def.id);
    return toRegisteredEngineTool(def, db);
  });
}

export function engineIdToFortModule(engineId: EngineToolId): "web" | "imazh" | "logo" | null {
  if (engineId === "maro_web") return "web";
  if (engineId === "maro_imazh" || engineId === "maro_marketing") return "imazh";
  if (engineId === "maro_logo") return "logo";
  return null;
}
