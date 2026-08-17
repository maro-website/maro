import type { CompiledGenerationBrief, ProviderMessagePackage } from "../types";

export interface ClaudeAdapterRequest {
  system: string;
  user: string;
  model: string;
  effort?: string;
  maxTokens?: number;
}

export interface OpenAIImageAdapterRequest {
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  n?: number;
}

export interface EngineAdapterResult<T> {
  ok: boolean;
  request?: T;
  error?: string;
}

export interface EngineExecutionGateInput {
  toolId: string;
  pipeline: string;
  promptCompilerV2: boolean;
  userId?: string | null;
  internalCanaryEligible?: boolean;
}

export type EngineAdapterTool = "maro_web" | "maro_imazh" | "maro_logo";

export interface MappedEngineProviderRequest {
  tool: EngineAdapterTool;
  provider: "anthropic" | "openai";
  claude?: ClaudeAdapterRequest;
  openaiImage?: OpenAIImageAdapterRequest;
  brief: CompiledGenerationBrief;
  messages: ProviderMessagePackage;
}
