/**
 * Source-of-truth matrix for Engine migration.
 * DB explicit override > code schema fallback for inputs.
 */

export interface SourceOfTruthEntry {
  domain: string;
  owner: string;
  writableBy: string[];
  readPrecedence: string;
  notes?: string;
}

export const ENGINE_SOURCE_OF_TRUTH: SourceOfTruthEntry[] = [
  {
    domain: "Tool existence",
    owner: "code registry (`src/lib/tools/registry.ts`)",
    writableBy: ["code deploy only"],
    readPrecedence: "code registry",
  },
  {
    domain: "Canonical tool mapping",
    owner: "Engine registry (`src/lib/engine/toolRegistry.ts`)",
    writableBy: ["code deploy only"],
    readPrecedence: "Engine registry adapters",
  },
  {
    domain: "System Prompt (Engine)",
    owner: "`system_prompt_versions`",
    writableBy: ["Engine CMS publish"],
    readPrecedence: "live system_prompt_versions > app_settings fallback (dual-read until 2B)",
    notes: "Production still reads app_settings until cutover.",
  },
  {
    domain: "Option prompt fragments",
    owner: "`app_settings.tool_prompts`",
    writableBy: ["legacy Master Prompts admin"],
    readPrecedence: "app_settings (production) + Engine compiler dual-read",
  },
  {
    domain: "Prompt Layers",
    owner: "`prompt_layers`",
    writableBy: ["Engine CMS"],
    readPrecedence: "prompt_layers (Engine) + fort_config.promptLayers (legacy production)",
  },
  {
    domain: "Dynamic input fields",
    owner: "`tool_input_fields` + code schema",
    writableBy: ["Engine Inputs CMS"],
    readPrecedence: "DB explicit override > `src/lib/fort/schema.ts` fallback",
  },
  {
    domain: "Legacy Fort fallback",
    owner: "`src/lib/fort/schema.ts`",
    writableBy: ["code deploy only"],
    readPrecedence: "Always merged as structural fallback",
  },
  {
    domain: "maroBrain content",
    owner: "`workspaces.brain_profile`",
    writableBy: ["user workspace UI"],
    readPrecedence: "getWorkspaceBrainProfile(owner, workspace)",
  },
  {
    domain: "maroBrain tool mapping",
    owner: "`tool_engine_config.brain_mapping`",
    writableBy: ["Engine CMS"],
    readPrecedence: "DB override > Engine registry defaults",
  },
  {
    domain: "Models",
    owner: "`tool_model_configs` (seeded from registry)",
    writableBy: ["Engine Models CMS"],
    readPrecedence: "tool_model_configs > registry ToolDef settings fallback",
  },
  {
    domain: "Customer price",
    owner: "`app_settings.pricing` + registry option costs",
    writableBy: ["legacy Plans admin"],
    readPrecedence: "pricing.options overrides > registry defaults",
  },
  {
    domain: "Provider credentials",
    owner: "server environment / secrets",
    writableBy: ["ops only"],
    readPrecedence: "env only",
  },
  {
    domain: "Feature flags",
    owner: "`feature_flags`",
    writableBy: ["super admin / ops"],
    readPrecedence: "feature_flags (prompt_compiler_v2 = Engine LIVE permission only; shadow uses per-tool pipeline)",
  },
  {
    domain: "Per-tool pipeline",
    owner: "`tool_engine_config.production_pipeline`",
    writableBy: ["Engine CMS (shadow only in 2A.5)"],
    readPrecedence: "DB per-tool state; global flag is emergency kill switch",
  },
];

export const INPUT_FIELD_PRECEDENCE = `
DB explicit override (tool_input_fields row) >
code schema fallback (src/lib/fort/schema.ts)

Structural/system fields from code schema are always present unless explicitly disabled in DB.
`.trim();
