/** Maro Engine — canonical types for Phase 2A compiler + CMS. */

export type EngineToolId =
  | "maro_imazh"
  | "maro_logo"
  | "maro_web"
  | "maro_filma"
  | "maro_zo"
  | "maro_marketing";

export type RegistryToolId = "reklama" | "logo" | "website" | "filma" | "zo" | "prompte" | "marketing";

export type PromptVersionStatus = "draft" | "review" | "live" | "archived";

export type LayerStatus = PromptVersionStatus;

export type ToolEngineStatus = "active" | "beta" | "maintenance" | "disabled" | "coming_soon";

export type ProductionPipeline = "legacy" | "shadow" | "engine";

/** Structured JSON conditions — never executed as code. */
export interface EngineCondition {
  /** e.g. tool, model, preset, fort.*, attachments.exists, plan, generationType */
  field: string;
  equals?: string[];
  includes?: string[];
  exists?: boolean;
}

export interface SystemPromptVersion {
  id: string;
  toolId: EngineToolId;
  versionLabel: string;
  status: PromptVersionStatus;
  content: string;
  changeNote: string;
  createdBy?: string | null;
  publishedBy?: string | null;
  createdAt: string;
  publishedAt?: string | null;
}

export interface PromptLayerRecord {
  id: string;
  layerKey: string;
  toolId: EngineToolId;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: EngineCondition[];
  instructions: string;
  versionLabel: string;
  status: LayerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ToolInputFieldRecord {
  id: string;
  toolId: EngineToolId;
  fieldKey: string;
  label: string;
  description: string;
  fieldType: string;
  placeholder?: string | null;
  options: Array<{ id: string; label: string; cost?: number }>;
  defaultValue?: unknown;
  required: boolean;
  enabled: boolean;
  sortOrder: number;
  standardVisible: boolean;
  fortVisible: boolean;
  conditionalVisibility: EngineCondition[];
  modelCompatibility: string[];
  presetCompatibility: string[];
  costModifier: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ToolModelConfigRecord {
  id: string;
  toolId: EngineToolId;
  modelId: string;
  displayName: string;
  provider: string;
  enabled: boolean;
  isDefault: boolean;
  isFallback: boolean;
  comingSoon: boolean;
  sortOrder: number;
  costMetadata: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface BrainMappingConfig {
  usesBrain: boolean;
  allowedSections: string[];
  maxContextTokens?: number;
  prioritySections?: string[];
}

export interface ToolEngineConfigRecord {
  toolId: EngineToolId;
  displayName: string;
  registryToolId: RegistryToolId | string;
  route: string;
  status: ToolEngineStatus;
  productionPipeline: ProductionPipeline;
  defaultModelId?: string | null;
  usesBrain: boolean;
  usesFort: boolean;
  presetSupport: boolean;
  brainMapping: BrainMappingConfig;
  metadata: Record<string, unknown>;
}

export interface RegisteredEngineTool extends ToolEngineConfigRecord {
  /** Legacy registry id for backwards compatibility. */
  legacyRegistryId: string;
  functional: boolean;
  comingSoon: boolean;
}

export type ConfigHealthStatus = "ready" | "warning" | "blocked";

export interface ConfigHealthIssue {
  code: string;
  severity: "warning" | "blocked";
  message: string;
}

export interface ConfigHealthResult {
  status: ConfigHealthStatus;
  issues: ConfigHealthIssue[];
}

export interface ProviderMessagePart {
  role: "system" | "user" | "assistant";
  content: string;
  label?: string;
}

export interface ProviderMessagePackage {
  /** Primary system instructions (model system param or equivalent). */
  systemInstructions: string;
  /** User-facing request content. */
  userContent: string;
  /** Optional additional system blocks (layers, technical). */
  systemBlocks: ProviderMessagePart[];
  /** Reference / attachment metadata (not binary payloads). */
  attachments: CompileAttachmentMeta[];
  /** Provider-specific parameters placeholder (model, size, effort, etc.). */
  parameters: Record<string, unknown>;
  /** Flat debug preview — not the canonical provider contract. */
  debugFlatPreview: string;
}

export interface StructuralDiffSection {
  key: string;
  label: string;
  legacy?: string;
  engine?: string;
  status: "same" | "different" | "legacy_only" | "engine_only";
}

export interface ShadowComparisonSnapshot {
  systemInstructions?: string;
  userContent?: string;
  brainSections?: string[];
  fortValues?: Record<string, unknown>;
  appliedLayers?: AppliedPromptLayer[];
  model?: string;
  estimatedCredits?: number;
  systemPromptVersion?: string;
  renderedPreview?: string;
  providerMessages?: ProviderMessagePackage;
  /** maroWeb shadow context */
  websiteType?: string;
  speed?: string;
  selections?: Record<string, string>;
  fortEnabled?: boolean;
  outputRequirements?: string;
  restrictions?: string;
  attachmentsMeta?: CompileAttachmentMeta[];
  metadata?: Record<string, unknown>;
}

export type ShadowReviewStatus =
  | "unreviewed"
  | "looks_good"
  | "needs_fix"
  | "expected_difference";

export interface ShadowContextMetadata {
  generationId?: string;
  jobId?: string;
  userId?: string;
  workspaceId?: string;
  modelId?: string;
  userPrompt?: string;
  websiteType?: string;
  speed?: string;
  selections?: Record<string, string>;
  fortEnabled?: boolean;
  fortValues?: Record<string, unknown>;
  legacyBrainSections?: string[];
  engineBrainSections?: string[];
  legacySystemMessage?: string;
  legacyUserMessage?: string;
  engineSystemInstructions?: string;
  engineUserContent?: string;
  appliedLayerNames?: string[];
  systemPromptVersion?: string;
  estimatedCredits?: number;
  compileStatus?: "success" | "failed";
  compileError?: string;
  timestamp?: string;
  providerRequestCount?: number;
  engineProviderRequestCount?: number;
}

export interface ShadowStructuralDiff {
  sections: StructuralDiffSection[];
  warnings: string[];
}

export interface BrainLoadResult {
  profile: import("@/lib/workspaces/brainTypes").WorkspaceBrainProfile | null;
  sources: import("@/lib/workspaces/brainTypes").WorkspaceSource[];
  workspaceId: string | null;
  ownerUserId: string | null;
  loaded: boolean;
  isolationOk: boolean;
  error?: string;
}

export interface CompileAttachmentMeta {
  type: string;
  name?: string;
  url?: string;
}

export interface CompileFortInput {
  enabled: boolean;
  values: Record<string, unknown>;
}

export interface CompileGenerationBriefInput {
  toolId: EngineToolId | string;
  userId?: string;
  workspaceId?: string;
  model?: string;
  userPrompt: string;
  attachments?: CompileAttachmentMeta[];
  selections?: Record<string, string>;
  fort?: CompileFortInput;
  presetId?: string;
  useBrain?: boolean;
  plan?: string;
  generationType?: string;
}

export interface AppliedPromptLayer {
  layerKey: string;
  name: string;
  priority: number;
  instructions: string;
}

export interface ConflictNote {
  kind: string;
  message: string;
  resolution: string;
}

export interface CreditEstimate {
  total: number;
  lines: Array<{ label: string; cost: number }>;
}

export interface CompiledGenerationBrief {
  tool: EngineToolId;
  registryToolId: string;
  model: string;
  systemPromptVersion: {
    id?: string;
    versionLabel: string;
    status: PromptVersionStatus | "fallback";
  };
  primaryUserRequest?: string;
  brandContext?: string;
  references?: string;
  creativeDirection?: string;
  technicalDirection?: string;
  fort?: Record<string, unknown>;
  preset?: { id: string; label?: string };
  appliedLayers: AppliedPromptLayer[];
  requiredElements?: string;
  restrictions?: string;
  outputRequirements?: string;
  metadata: {
    productionPipeline: ProductionPipeline;
    promptCompilerV2: boolean;
    brainUsed: boolean;
    brainSections: string[];
    conflicts: ConflictNote[];
    warnings: string[];
    selections: Record<string, string>;
  };
  /** Provider-independent message roles for Phase 2B adapters. */
  providerMessages?: ProviderMessagePackage;
  /** Flat concatenated preview for admin debugging only. */
  renderedProviderPrompt?: string;
  estimatedCredits?: CreditEstimate;
  configHealth?: ConfigHealthResult;
}

export interface EngineCompileContext {
  tool: RegisteredEngineTool;
  model: string;
  modelConfig?: ToolModelConfigRecord;
  systemPrompt: SystemPromptVersion | null;
  draftPrompt?: SystemPromptVersion | null;
  layers: PromptLayerRecord[];
  inputFields: ToolInputFieldRecord[];
  models: ToolModelConfigRecord[];
  toolPrompts: Record<string, string>;
  masterPrompt?: string;
  fortConfig?: Record<string, unknown>;
  brainProfile?: import("@/lib/workspaces/brainTypes").WorkspaceBrainProfile | null;
  brainSources?: import("@/lib/workspaces/brainTypes").WorkspaceSource[];
  brainLoad?: BrainLoadResult;
  presetPrompt?: string | null;
  pricingOverrides?: Record<string, number>;
  promptCompilerV2: boolean;
}
