import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateV1ModelSet } from "@/lib/engine/v1ImageModels";
import { DEFAULT_LOGO_CONTENT, validateLogoContent } from "@/lib/marologo/content";

describe("offline validation of read-only product configuration evidence", () => {
  it("accepts both current published model sets, Logo content and unique live prompts", () => {
    const evidence = JSON.parse(readFileSync("docs/evidence/production-contract-20260930.json", "utf8"));
    expect(evidence.transaction_read_only).toBe("on");
    const config = evidence.v1_product_configuration;
    for (const moduleId of ["maro_imazh", "maro_logo"] as const) {
      const models = validateV1ModelSet(config.models.filter((r: { tool_id: string }) => r.tool_id === moduleId), moduleId);
      expect(models.some((m) => m.enabled && m.isDefault)).toBe(true);
      const prompt = config.published_prompt_summary.find((r: { tool_id: string }) => r.tool_id === moduleId);
      expect(Number(prompt.live_count)).toBe(1); expect(Number(prompt.minimum_content_length)).toBeGreaterThan(0);
    }
    expect(config.logo_content).toHaveLength(1);
    const saved = config.logo_content[0].logo_wizard_content;
    expect(validateLogoContent(saved ?? DEFAULT_LOGO_CONTENT)).toBeTruthy();
  });
});
