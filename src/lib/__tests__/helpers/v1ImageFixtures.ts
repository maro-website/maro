import { DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { buildGenerationRequest } from "@/lib/marologo/generation";

export function modelRow(model = "flare", module = "maro_imazh", credits = 7) {
  // Test values only; these are not product prices or seed data.
  return {
    id: `${module}-${model}`, tool_id: module, model_id: model, provider: "openai",
    display_name: model === "flare" ? "Flare" : "Sunburst", enabled: true,
    is_default: model === "flare", coming_soon: false, sort_order: model === "flare" ? 0 : 1,
    metadata: { providerModelId: `gpt-image-2.5-${model}`, description: "Test description", secret: "private" },
    cost_metadata: { customerCredits: credits, pricingStage: "internal" }, updated_at: "2026-09-17T00:00:00Z",
  };
}

export function logoRequest() {
  const wizard = structuredClone(DEFAULT_WIZARD_STATE);
  wizard.brand.name = "Maro";
  wizard.brand.description = "A creative studio";
  return buildGenerationRequest(wizard, []);
}

export const imazhRequest = { toolId: "reklama", prompt: "A coffee bag on a table" };
