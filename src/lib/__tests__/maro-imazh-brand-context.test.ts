import { describe, expect, it } from "vitest";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import { normalizeWorkspaceBrand } from "@/lib/workspaces/brand";
import { resolveCanonicalMaroImageBrandContext } from "@/lib/maro-imazh/brandContext";
import {
  BRAND_CONTEXT_FIDELITY_DIRECTION,
  IMAGE_TEXT_OFF_WITH_REFERENCE,
  IMAGE_TEXT_OFF_WITH_WORKSPACE_BRAND_ASSET,
  WORKSPACE_BRAND_ASSET_DIRECTION,
  buildLegacyImageProviderRequest,
} from "@/lib/engine/imageCompile";

const selections = {
  model: "gpt-image-2",
  format: "ig-post",
  text: "off",
  speed: "normal",
};

function brain(input: {
  name: string;
  category: string;
  description: string;
  logoUrl?: string | null;
}) {
  const profile = emptyBrainProfile();
  profile.brand.name = input.name;
  profile.brand.category = input.category;
  profile.brand.description = input.description;
  profile.brand.logoUrl = input.logoUrl ?? null;
  profile.target.audience = `Audience for ${input.name}`;
  profile.content.avoid = `Avoid unrelated categories for ${input.name}`;
  return profile;
}

describe("canonical maroImazh brand context", () => {
  it("isolates Workspace A from Workspace B and switches with canonical workspace id", () => {
    const workspaceA = resolveCanonicalMaroImageBrandContext({
      workspaceId: "workspace-a",
      brain: brain({
        name: "Fleet & Miles",
        category: "Automotive",
        description: "B2B fleet and reservation management for rent-a-car operators.",
      }),
      brand: null,
    });
    const workspaceB = resolveCanonicalMaroImageBrandContext({
      workspaceId: "workspace-b",
      brain: brain({
        name: "Northwind Bakery",
        category: "Food & Beverage",
        description: "Artisan bread and pastries.",
      }),
      brand: null,
    });

    expect(workspaceA.brainBrief).toContain("Fleet & Miles");
    expect(workspaceA.brainBrief).not.toContain("Northwind Bakery");
    expect(workspaceB.brainBrief).toContain("Northwind Bakery");
    expect(workspaceB.brainBrief).not.toContain("Fleet & Miles");
    expect(workspaceA.telemetry.context_workspace_hash).not.toBe(
      workspaceB.telemetry.context_workspace_hash
    );
    expect(workspaceA.telemetry.context_fingerprint).not.toBe(
      workspaceB.telemetry.context_fingerprint
    );
  });

  it("falls back to canonical workspace brand only when maroBrain is unconfigured", () => {
    const context = resolveCanonicalMaroImageBrandContext({
      workspaceId: "workspace-brand-only",
      brain: emptyBrainProfile(),
      brand: normalizeWorkspaceBrand({ name: "Brand Only", primaryColor: "#102030" }),
    });

    expect(context.source).toBe("workspace_brand");
    expect(context.workspaceBrandBrief).toContain("Brand Only");
    expect(context.brainBrief).toBeUndefined();
  });

  it("grounds a generic active-brand request and treats automatic logo as identity, not product", () => {
    const context = resolveCanonicalMaroImageBrandContext({
      workspaceId: "fleet-workspace",
      brain: brain({
        name: "Fleet & Miles",
        category: "Automotive",
        description: "B2B fleet and reservation management for rent-a-car operators.",
        logoUrl: "data:image/png;base64,FLEET_LOGO",
      }),
      brand: normalizeWorkspaceBrand({
        name: "Fleet & Miles",
        primaryColor: "#A9F04D",
        secondaryColor: "#0B0B0B",
      }),
    });
    const request = buildLegacyImageProviderRequest({
      toolId: "maro_imazh",
      userPrompt:
        "Use my active brand and create a premium social media campaign image. Make it cinematic, minimal and expensive-looking.",
      selections,
      toolPrompts: {},
      model: "gpt-image-2",
      brainBrief: context.brainBrief,
      workspaceBrandBrief: context.workspaceBrandBrief,
      brainLogoUrl: context.logoUrl,
      fetchedUrls: new Set([context.logoUrl!]),
    });

    expect(request.prompt).toContain("Brand: Fleet & Miles");
    expect(request.prompt).toContain("Category: Automotive");
    expect(request.prompt).toContain("rent-a-car operators");
    expect(request.prompt).toContain("Primary color: #A9F04D");
    expect(request.prompt).toContain(BRAND_CONTEXT_FIDELITY_DIRECTION);
    expect(request.prompt).toContain(WORKSPACE_BRAND_ASSET_DIRECTION);
    expect(request.prompt).toContain(IMAGE_TEXT_OFF_WITH_WORKSPACE_BRAND_ASSET);
    expect(request.prompt).not.toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
    expect(request.prompt).not.toMatch(/SADOER|hair[- ]?care|ginseng|snake oil|shampoo/i);
    expect(request.operation).toBe("edit");
  });

  it("keeps UI and MCP provider inputs equivalent for the same canonical request", () => {
    const context = resolveCanonicalMaroImageBrandContext({
      workspaceId: "fleet-workspace",
      brain: brain({
        name: "Fleet & Miles",
        category: "Automotive",
        description: "Fleet operations software.",
      }),
      brand: null,
    });
    const common = {
      toolId: "maro_imazh" as const,
      userPrompt: "Premium campaign for my active brand",
      selections,
      toolPrompts: {},
      model: "gpt-image-2",
      brainBrief: context.brainBrief,
    };

    const ui = buildLegacyImageProviderRequest(common);
    const mcp = buildLegacyImageProviderRequest(common);
    expect(mcp).toEqual(ui);
    expect(mcp.prompt).toContain(BRAND_CONTEXT_FIDELITY_DIRECTION);
  });

  it("emits only safe hashed telemetry and no private context text", () => {
    const workspaceId = "private-workspace-id";
    const context = resolveCanonicalMaroImageBrandContext({
      workspaceId,
      brain: brain({
        name: "Fleet & Miles",
        category: "Automotive",
        description: "Private canonical business description.",
      }),
      brand: null,
    });
    const serialized = JSON.stringify(context.telemetry);

    expect(serialized).not.toContain(workspaceId);
    expect(serialized).not.toContain("Fleet & Miles");
    expect(serialized).not.toContain("Automotive");
    expect(serialized).not.toContain("Private canonical business description");
    expect(context.telemetry.context_source).toBe("maro_brain");
    expect(context.telemetry.context_configured).toBe(true);
    expect(context.telemetry.context_fingerprint).toHaveLength(24);
  });

  it("does not retain prior request context between calls", () => {
    const first = resolveCanonicalMaroImageBrandContext({
      workspaceId: "first",
      brain: brain({ name: "First Brand", category: "Technology", description: "First" }),
      brand: null,
    });
    const second = resolveCanonicalMaroImageBrandContext({
      workspaceId: "second",
      brain: brain({ name: "Second Brand", category: "Retail", description: "Second" }),
      brand: null,
    });

    expect(second.brainBrief).toContain("Second Brand");
    expect(second.brainBrief).not.toContain("First Brand");
    expect(first.telemetry.context_fingerprint).not.toBe(second.telemetry.context_fingerprint);
  });
});
