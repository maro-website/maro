import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { validateModelEdits, validateLayerEdit, validatePromptContent } from "@/lib/admin/v1Configuration";
import { resolveV1ImageModel, validateV1ModelSet, publicV1ImageModel } from "@/lib/engine/v1ImageModels";
import { parseV1ImageRequest, resolveV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { DEFAULT_LOGO_CONTENT, logoInitialState, logoContentAnswerErrors, validateLogoContent, logoOptions } from "@/lib/marologo/content";
import { validateLogoWizardAnswers } from "@/lib/marologo/request";
import { buildMaroLogoBrief } from "@/lib/marologo/briefBuilder";
import { LogoContentContext, LogoFields } from "@/components/marologo/LogoContent";
import { StepBrand } from "@/components/marologo/steps/StepBrand";
import { ColorEditor } from "@/components/marologo/ui/ColorEditor";
import { ReferenceUpload } from "@/components/marologo/ui/ReferenceUpload";
import { LogoTypeCards } from "@/components/marologo/ui/LogoTypeCards";
import { OperationalJobRow, type OperationalJob } from "@/components/admin/v1/V1Operations";
import { eligibleForReconciliation } from "@/lib/admin/v1Operations";
import { imazhRequest, logoRequest, modelRow } from "./helpers/v1ImageFixtures";
vi.stubGlobal("React", React);
const rows = () => [modelRow("flare", "maro_imazh", 5), modelRow("sunburst", "maro_imazh", 5)];
const edits = () => validateV1ModelSet(rows(), "maro_imazh").map(publicV1ImageModel);
describe("V1 operational model configuration", () => {
  it("admin price/descriptor changes reach projection and the next immutable snapshot", async () => {
    const proposed = edits(); proposed[0].customerCredits = 6; proposed[0].descriptor = "Changed descriptor";
    const checked = validateModelEdits(proposed, "maro_imazh", rows());
    expect(checked[0]).toMatchObject({ customerCredits: 6, descriptor: "Changed descriptor" });
    const changed = rows(); changed[0].cost_metadata.customerCredits = checked[0].customerCredits; changed[0].metadata.description = checked[0].descriptor;
    const resolved = await resolveV1ImageRequest(parseV1ImageRequest(imazhRequest), "owner", { loadModels: async () => changed, resolveWorkspace: async () => null, resolveReference: vi.fn(), loadPreset: vi.fn() });
    expect(resolved.snapshot.model).toMatchObject({ customerCredits: 6, descriptor: "Changed descriptor", providerModelId: "gpt-image-2.5-flare" });
    expect(Object.isFrozen(resolved.snapshot.model)).toBe(true);
  });
  it("an omitted model resolves the configured Sunburst default", async () => {
    const changed = rows(); changed[0].is_default = false; changed[1].is_default = true;
    const resolved = await resolveV1ImageRequest(parseV1ImageRequest(imazhRequest), "owner", { loadModels: async () => changed, resolveWorkspace: async () => null, resolveReference: vi.fn(), loadPreset: vi.fn() });
    expect(resolved.snapshot.logicalModel).toBe("sunburst"); expect(resolved.snapshot.selections.model).toBe("sunburst");
  });
  it("disabled Sunburst is excluded from the public enabled set and rejected explicitly", () => {
    const changed = rows(); changed[1].enabled = false;
    expect(validateV1ModelSet(changed, "maro_imazh").filter((m) => m.enabled).map(publicV1ImageModel).map((m) => m.key)).toEqual(["flare"]);
    expect(() => resolveV1ImageModel(changed, "maro_imazh", "sunburst")).toThrow("model_disabled");
  });
  it.each([0, -1, 1.5, "6", null])("rejects price %j", (price) => { const value = edits() as unknown as Array<Record<string, unknown>>; value[0].customerCredits = price; expect(() => validateModelEdits(value, "maro_imazh", rows())).toThrow(); });
  it.each(["none", "multiple", "disabled-default"])("rejects %s default", (mode) => {
    const values = edits(); values[0].isDefault = mode !== "none"; values[1].isDefault = mode === "multiple"; values[0].enabled = mode !== "disabled-default";
    expect(() => validateModelEdits(values, "maro_imazh", rows())).toThrow();
  });
  it("cannot add a Logo model, change its provider or remove its only enabled default", () => {
    expect(() => validateModelEdits(edits(), "maro_logo", [modelRow("flare", "maro_logo")])).toThrow();
    expect(() => validateModelEdits([{ ...edits()[0], providerModelId: "other" }], "maro_logo", [modelRow("flare", "maro_logo")])).toThrow();
    expect(() => validateModelEdits([{ ...edits()[0], enabled: false }], "maro_logo", [modelRow("flare", "maro_logo")])).toThrow();
  });
});
describe("production instruction guards", () => {
  it.each(["", "  ", null, 7, "x".repeat(100001)])("rejects invalid prompt content", (value) => expect(() => validatePromptContent(value)).toThrow());
  const layer = { layer_key: "v1.production.format.square", status: "live", conditions: [{ field: "selections.format", equals: ["fb-post"] }] };
  it("allows content only and preserves structural rules", () => { expect(validateLayerEdit({ id: "layer", instructions: "New instructions" }, layer).instructions).toBe("New instructions"); });
  it.each([{ conditions: [] }, { priority: 999 }, { layer_key: "v1.production.fort.x" }])("refuses a structural layer mutation", (patch) => expect(() => validateLayerEdit({ id: "layer", instructions: "Text", ...patch }, layer)).toThrow());
  it("refuses invalid existing conditions and excluded namespaces", () => {
    expect(() => validateLayerEdit({ instructions: "Text" }, { ...layer, conditions: [{ field: "selections.provider", equals: ["other"] }] })).toThrow();
    expect(() => validateLayerEdit({ instructions: "Text" }, { ...layer, layer_key: "v1.production.fort.x" })).toThrow();
  });
});
describe("fixed Logo contract, configurable content", () => {
  it("renders changed question wording and placeholders without changing answer identities", () => {
    const content = structuredClone(DEFAULT_LOGO_CONTENT); content["brand.name"].label = "Brand name revised"; content["brand.name"].placeholder = "Your brand";
    const wizard = logoRequest().logoWizard!;
    const html = renderToStaticMarkup(React.createElement(LogoContentContext.Provider, { value: content }, React.createElement(StepBrand, { step: 1, highestStepReached: 1, wizard, errors: {}, onChange: vi.fn(), onNext: vi.fn() })));
    expect(html).toContain("Brand name revised"); expect(html).toContain('placeholder="Your brand"');
    expect(validateLogoWizardAnswers(wizard)).toEqual(wizard);
    expect(buildMaroLogoBrief(wizard, false)).toBe(buildMaroLogoBrief(validateLogoWizardAnswers(wizard), false));
  });
  it("orders fields/options and renders new option labels with stable values", () => {
    const content = structuredClone(DEFAULT_LOGO_CONTENT); content["brand.name"].order = 3;
    content["logo.type"].options[0].order = 99; content["logo.type"].options[0].label = "Custom wordmark label";
    const html = renderToStaticMarkup(React.createElement(LogoContentContext.Provider, { value: content }, React.createElement(LogoFields, { fields: { "brand.name": "Name marker", "brand.description": "Description marker" } })));
    expect(html.indexOf("Description marker")).toBeLessThan(html.indexOf("Name marker"));
    expect(logoOptions(content, "logo.type").at(-1)?.value).toBe("wordmark");
    const options = renderToStaticMarkup(React.createElement(LogoContentContext.Provider, { value: content }, React.createElement(LogoTypeCards, { value: "wordmark", onChange: vi.fn() })));
    expect(options).toContain("Custom wordmark label");
  });
  it("renders configurable color/reference wording without changing their controls", () => {
    const content = structuredClone(DEFAULT_LOGO_CONTENT); content["look.colors"].label = "Brand palette"; content.references.label = "Visual references";
    const html = renderToStaticMarkup(React.createElement(LogoContentContext.Provider, { value: content }, React.createElement(React.Fragment, null,
      React.createElement(ColorEditor, { mode: "maro_decides", values: [], onModeChange: vi.fn(), onValuesChange: vi.fn() }),
      React.createElement(ReferenceUpload, { references: [], onChange: vi.fn() }))));
    expect(html).toContain("Brand palette"); expect(html).toContain("Visual references");
  });
  it("applies configured defaults only to existing choices", () => { const c = structuredClone(DEFAULT_LOGO_CONTENT); c["presentation.mode"].defaultValue = "mockup"; expect(logoInitialState(validateLogoContent(c)).presentation.mode).toBe("mockup"); });
  it("enforces optional required/disabled text fields server-side", async () => {
    const content = structuredClone(DEFAULT_LOGO_CONTENT); content["brand.slogan"].required = true;
    expect(logoContentAnswerErrors(logoRequest().logoWizard!, content).slogan).toBeTruthy();
    await expect(resolveV1ImageRequest(parseV1ImageRequest(logoRequest()), "owner", { loadModels: async () => [modelRow("flare", "maro_logo")], resolveWorkspace: vi.fn(), resolveReference: vi.fn(), loadPreset: vi.fn(), loadLogoContent: async () => content })).rejects.toThrow("invalid_logo_content_answer");
  });
  it.each(["new-key", "type", "disable-name", "remove-required", "bad-option", "bad-default", "duplicate-option", "hidden-required"])("rejects invalid Logo configuration: %s", (mode) => {
    const c = structuredClone(DEFAULT_LOGO_CONTENT) as unknown as Record<string, any>;
    if (mode === "new-key") c.future = {};
    if (mode === "type") c["brand.name"].type = "object";
    if (mode === "disable-name") c["brand.name"].enabled = false;
    if (mode === "remove-required") c["brand.name"].required = false;
    if (mode === "bad-option") c["logo.type"].options[0].value = "unapproved";
    if (mode === "bad-default") c["logo.type"].defaultValue = "unapproved";
    if (mode === "duplicate-option") c["logo.type"].options[0] = c["logo.type"].options[1];
    if (mode === "hidden-required") { c["brand.slogan"].enabled = false; c["brand.slogan"].required = true; }
    expect(() => validateLogoContent(c)).toThrow();
  });
});
describe("operational presentation and eligibility", () => {
  const base: OperationalJob = { id: "job", createdAt: "2026-09-17T00:00:00Z", userId: "owner", module: "maro_imazh", model: "flare", provider: "openai", providerModelId: "gpt-image-2.5-flare", status: "completed", generationId: "generation", configuredCredits: 5, charged: 5, reserved: 0, output: "stored", history: "saved", settlement: "charged", phase: "completed", failure: null, retainedOrphan: false, recoveredFromJobId: null, latencyMs: 1000, eligible: false };
  it.each([{ status: "completed" }, { status: "failed", failure: "history_failed", history: "missing", retainedOrphan: true, settlement: "released", charged: 0 }, { status: "processing", phase: "settlement_pending", settlement: "reserved", charged: 0, reserved: 5, eligible: true }])("renders durable state %j", (patch) => {
    const html = renderToStaticMarkup(React.createElement(OperationalJobRow, { job: { ...base, ...patch }, busy: false, reconcile: vi.fn() }));
    expect(html).toContain(patch.status); expect(html).toContain("Configured: 5");
    if (patch.retainedOrphan) expect(html).toContain("Retained output without history");
    if (patch.eligible) expect(html).toContain("Reconcile");
  });
  it("only permits stale nonterminal durable jobs", () => {
    const now = Date.now(); const j = { status: "processing", created_at: new Date(now - 16 * 60000).toISOString(), metadata: { v1_durable: true } };
    expect(eligibleForReconciliation(j, now)).toBe(true);
    expect(eligibleForReconciliation({ ...j, status: "completed" }, now)).toBe(false);
    expect(eligibleForReconciliation({ ...j, created_at: new Date(now).toISOString() }, now)).toBe(false);
    expect(eligibleForReconciliation({ ...j, metadata: {} }, now)).toBe(false);
  });
});
