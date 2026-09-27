import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODULE_AVAILABILITY, generationAvailabilityError, isModuleLive, resolveProductModule } from "@/lib/modules/availability";
import { ACTIVE_MAIN_TOOLS, getTool } from "@/lib/tools/registry";
import { listRegisteredEngineTools } from "@/lib/engine/toolRegistry";
import { HUB_TOOLS } from "@/components/hub/hubTools";
import { TOP_BAR_DESTINATIONS } from "@/lib/nav/destinations";

const spies = vi.hoisted(() => ({
  provider: vi.fn(), settings: vi.fn(), admin: vi.fn(), auth: vi.fn(), key: vi.fn(() => true),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: spies.admin, getUserFromToken: spies.auth, getAppSettings: spies.settings,
  supabaseServerConfigured: () => true,
}));
vi.mock("@/lib/ai/openai", () => ({
  IMAGE_MODEL: "test-image", hasOpenAiKey: spies.key,
  generateImages: spies.provider, editImages: spies.provider, OpenAIImageError: class extends Error {},
}));
vi.mock("@/lib/ai/anthropic", () => ({
  AI_MODEL: "test-web", CHAT_MODEL: "test-chat", hasAiKey: spies.key, hasChatKey: spies.key,
  callClaudeJSON: spies.provider, callClaudeText: spies.provider, completeChat: spies.provider, streamChat: spies.provider,
}));
vi.mock("@/lib/ai/elevenlabs", () => ({
  hasElevenKey: spies.key, textToSpeech: spies.provider, generateMusic: spies.provider,
  generateSoundEffect: spies.provider, speechToSpeech: spies.provider, isolateAudio: spies.provider, speechToText: spies.provider,
}));

beforeEach(() => vi.clearAllMocks());

describe("V1 product release policy", () => {
  it("has exactly four live capabilities and two generators", () => {
    expect(Object.entries(MODULE_AVAILABILITY).filter(([, m]) => m.status === "live").map(([id]) => id))
      .toEqual(["imazh", "logo", "brain", "presets"]);
    expect(ACTIVE_MAIN_TOOLS.map((tool) => tool.id)).toEqual(["reklama", "logo"]);
    expect(generationAvailabilityError("reklama")).toBeNull();
    expect(generationAvailabilityError("logo")).toBeNull();
    expect(generationAvailabilityError("brain")?.error).toBe("module_not_generator");
    expect(generationAvailabilityError("presets")?.error).toBe("module_not_generator");
  });

  it.each(["website", "web", "maro_web", "maroWeb", "edit", "edit-html"])("parks Web alias %s until V1.5", (id) => {
    expect(generationAvailabilityError(id)).toMatchObject({ status: 403, module: "web", targetVersion: "V1.5" });
  });

  it.each(["filma", "maro_filma", "zo", "maroZo", "maroAudio", "audio", "marketing", "maro_marketing", "fort", "chat"])("parks %s until V2", (id) => {
    expect(isModuleLive(id)).toBe(false);
    expect(generationAvailabilityError(id)).toMatchObject({ status: 403, targetVersion: "V2" });
  });

  it.each([undefined, null, {}, "", "bogus", "__proto__", "constructor"])("rejects unknown module %j", (id) => {
    expect(resolveProductModule(id)).toBeNull();
    expect(generationAvailabilityError(id)).toEqual({ error: "unknown_module", status: 400 });
  });

  it("keeps tools, Hub and navigation consistent", () => {
    for (const id of ["website", "filma", "zo"]) {
      expect(getTool(id)).toMatchObject({ functional: false, comingSoon: true });
      expect(HUB_TOOLS.find((tool) => tool.toolId === id)?.locked).toBe(true);
      expect(TOP_BAR_DESTINATIONS.find((tool) => tool.toolId === id)?.comingSoon).toBe(true);
    }
    expect(TOP_BAR_DESTINATIONS.find((tool) => tool.id === "web")?.badge).toContain("V1.5");
  });

  it("database-shaped overrides cannot reopen future modules or Fort", () => {
    const tools = listRegisteredEngineTools(new Map([
      ["maro_web", { status: "active", functional: true, comingSoon: false, usesFort: true }],
      ["maro_imazh", { usesFort: true }],
    ]));
    expect(tools.find((tool) => tool.toolId === "maro_web"))
      .toMatchObject({ functional: false, comingSoon: true, status: "coming_soon", usesFort: false });
    expect(tools.every((tool) => !tool.usesFort)).toBe(true);
  });
});

describe("V1 route boundaries", () => {
  const routes = [
    ["generate", "web", () => import("@/app/api/ai/generate/route")],
    ["edit", "web", () => import("@/app/api/ai/edit/route")],
    ["edit-html", "web", () => import("@/app/api/ai/edit-html/route")],
    ["audio", "audio", () => import("@/app/api/ai/audio/route")],
    ["chat", "chat", () => import("@/app/api/ai/chat/route")],
  ] as const;

  it.each(routes)("blocks /api/ai/%s before body, keys, auth, database or provider access", async (route, module, load) => {
    const { POST } = await load();
    const request = new Request(`http://localhost/api/ai/${route}`, {
      method: "POST", headers: { Authorization: "Bearer stale-admin-token" }, body: "invalid-json",
    });
    const read = vi.spyOn(request, "text");
    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "module_unavailable", module });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(read).not.toHaveBeenCalled();
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();
  });

  it.each(["website", "maro_web", "filma", "audio", "zo", "marketing", "fort", "chat"])("cannot bypass parking through image toolId=%s", async (toolId) => {
    const { POST } = await import("@/app/api/ai/image/route");
    const response = await POST(new Request("http://localhost/api/ai/image", {
      method: "POST", body: JSON.stringify({ toolId, prompt: "test", selections: { model: "anything" } }),
    }));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("module_unavailable");
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();
  });

  it.each(["reklama", "logo"])("leaves %s on the existing active request path", async (toolId) => {
    const { POST } = await import("@/app/api/ai/image/route");
    const response = await POST(new Request("http://localhost/api/ai/image", {
      method: "POST", body: JSON.stringify({ toolId, prompt: "" }),
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(toolId === "logo" ? "invalid_request" : "missing-prompt");
    expect(spies.provider).not.toHaveBeenCalled();
  });

  it("also blocks a future caller at job preparation before touching the database", async () => {
    const { prepareGeneration } = await import("@/lib/generation/orchestrator");
    await expect(prepareGeneration({ req: new Request("http://localhost"), module: "web", cost: 10 }))
      .rejects.toMatchObject({ status: 403, code: "module_unavailable" });
    expect(spies.admin).not.toHaveBeenCalled();
    expect(spies.auth).not.toHaveBeenCalled();
  });
});
