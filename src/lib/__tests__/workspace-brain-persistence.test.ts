import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { emptyBrainProfile, type WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";
import { isBrainConfigured } from "@/lib/workspaces/brainProfile";
import { readBrainDraft, writeBrainDraft, clearSavedBrainDraft, recoverLegacyBrainDraft } from "@/lib/workspaces/brainDraft";
import { workspaceRequest } from "@/lib/workspaces/request";
import { subscribeToSession } from "@/lib/supabase/sessionSubscription";

const mocks = vi.hoisted(() => ({ client: null as ReturnType<typeof createClient> | null, brainAccess: true }));
vi.mock("@/lib/supabase/client", () => ({
  supabaseConfigured: true,
  getSupabaseBrowser: () => mocks.client,
  getAccessToken: async () => "test-token",
}));
vi.mock("@/lib/services/projectAssetService", () => ({ resolvePrivateAssetRefs: async () => ({}) }));
vi.mock("@/lib/workspaces/accountPolicyClient", () => ({ fetchAccountPolicy: async () => ({ brainAccess: mocks.brainAccess, brainResetAt: null }) }));

beforeEach(() => {
  mocks.brainAccess = true;
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  mocks.client = createClient("https://workspace-test.invalid", "test-anon", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    accessToken: async () => "test-token",
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("workspace and maroBrain persistence", () => {
  it("reads whether Brain was created without saving a default profile or requiring an active plan", async () => {
    mocks.brainAccess = false;
    let raw: object = {};
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ brain_profile: raw }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const { fetchBrainCreated, fetchBrainProfile } = await import("@/lib/workspaces/brainService");
    expect(await fetchBrainCreated("alice", "ws-a")).toBe(false);
    raw = emptyBrainProfile();
    expect(await fetchBrainCreated("alice", "ws-a")).toBe(true);
    await expect(fetchBrainProfile("alice", "ws-a")).rejects.toThrow("brain_plan_required");
    expect(fetch.mock.calls.every(([, init]) => !init || init.method === "GET")).toBe(true);
  });

  it("creates explicitly with owner/reset guards and never replaces another tab's saved Brain", async () => {
    const saved = emptyBrainProfile(); saved.brand.name = "Another tab's brand";
    let patchUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") { patchUrl = url; return new Response("[]", { status: 200 }); }
      return new Response(JSON.stringify({ brain_profile: saved }), { status: 200 });
    }));
    const { createBrainProfile, fetchBrainProfile } = await import("@/lib/workspaces/brainService");
    await createBrainProfile("alice", "ws-a", null);
    const params = new URL(patchUrl).searchParams;
    expect(params.get("owner_id")).toBe("eq.alice");
    expect(params.get("id")).toBe("eq.ws-a");
    expect(params.get("brain_profile")).toBe("eq.{}");
    expect(params.get("brain_reset_at")).toBe("is.null");
    expect((await fetchBrainProfile("alice", "ws-a")).brand.name).toBe(saved.brand.name);
  });

  it("persists explicit creation even before any brand fields have been filled", async () => {
    let raw: WorkspaceBrainProfile | Record<string, never> = {};
    let writes = 0;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        writes++;
        raw = JSON.parse(String(init.body)).brain_profile;
        return new Response(JSON.stringify([{ id: "ws-a" }]), { status: 200 });
      }
      return new Response(JSON.stringify({ brain_profile: raw }), { status: 200 });
    }));
    const { createBrainProfile, fetchBrainCreated } = await import("@/lib/workspaces/brainService");
    expect(await fetchBrainCreated("alice", "ws-a")).toBe(false);
    expect(writes).toBe(0);
    await createBrainProfile("alice", "ws-a", null);
    expect(await fetchBrainCreated("alice", "ws-a")).toBe(true);
    expect(writes).toBe(1);
    expect(raw).toEqual(emptyBrainProfile());
  });

  it("does not claim creation succeeded if a retention reset invalidated the guarded write", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => new Response(
      init?.method === "PATCH" ? "[]" : JSON.stringify({ brain_profile: {} }), { status: 200 }
    )));
    const { createBrainProfile } = await import("@/lib/workspaces/brainService");
    await expect(createBrainProfile("alice", "ws-a", null)).rejects.toThrow("brain_refresh_required");
  });

  it("does not resurrect either a scoped draft or legacy cache after a server reset", () => {
    const old = emptyBrainProfile(); old.brand.name = "Expired draft";
    writeBrainDraft("alice", "ws-a", old);
    localStorage.setItem("maro:ws-brain:ws-a", JSON.stringify(old));
    const resetAt = new Date(Date.now() + 1000).toISOString();
    expect(readBrainDraft("alice", "ws-a", resetAt)).toBeNull();
    expect(recoverLegacyBrainDraft("alice", "ws-a", emptyBrainProfile(), resetAt)).toBeNull();
    expect(readBrainDraft("alice", "ws-a")).toBeNull();
    const pastReset = new Date(Date.now() - 1000).toISOString();
    // Typing in a stale open tab after reset must not give old content a new epoch.
    writeBrainDraft("alice", "ws-a", old, null);
    expect(readBrainDraft("alice", "ws-a", pastReset)).toBeNull();
    writeBrainDraft("alice", "ws-a", old, pastReset);
    expect(readBrainDraft("alice", "ws-a", pastReset)).toEqual(old);
  });
  it("releases the auth callback before starting any authenticated request", async () => {
    vi.useFakeTimers();
    const auth = createClient("https://auth-test.invalid", "test-anon", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }).auth;
    let notify: Parameters<typeof auth.onAuthStateChange>[0] | undefined;
    const unsubscribe = vi.fn();
    vi.spyOn(auth, "onAuthStateChange").mockImplementation((callback) => {
      notify = callback;
      return { data: { subscription: { id: "test", callback, unsubscribe } } };
    });
    let locked = true;
    const observed: boolean[] = [];
    const cleanup = subscribeToSession(auth, () => { observed.push(locked); });
    expect(notify!("SIGNED_IN", null)).toBeUndefined();
    expect(observed).toEqual([]);
    locked = false;
    await vi.runAllTimersAsync();
    expect(observed).toEqual([false]);
    notify!("TOKEN_REFRESHED", null);
    cleanup();
    await vi.runAllTimersAsync();
    expect(observed).toEqual([false]);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("recovers every Brain section across remounts and isolates accounts/workspaces", () => {
    const profile = emptyBrainProfile();
    profile.brand.name = "Draft brand";
    profile.target.audience = "Audience";
    profile.goal.primaryGoal = "Goal";
    profile.market.region = "Region";
    profile.content.voice = "Voice";
    expect(writeBrainDraft("alice", "ws-a", profile)).toBe(true);
    expect(readBrainDraft("alice", "ws-a")).toEqual(profile);
    expect(readBrainDraft("bob", "ws-a")).toBeNull();
    expect(readBrainDraft("alice", "ws-b")).toBeNull();
    const newer = { ...profile, content: { ...profile.content, voice: "Newer edit" } };
    writeBrainDraft("alice", "ws-a", newer);
    clearSavedBrainDraft("alice", "ws-a", profile);
    expect(readBrainDraft("alice", "ws-a")).toEqual(newer);
    clearSavedBrainDraft("alice", "ws-a", newer);
    expect(readBrainDraft("alice", "ws-a")).toBeNull();
  });

  it("reports denied workspace updates and Brain saves instead of local false success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "denied", message: "denied", code: "42501" }), { status: 403 })));
    const { updateWorkspace, fetchWorkspaces } = await import("@/lib/workspaces/service");
    const { saveBrainProfile } = await import("@/lib/workspaces/brainService");
    await expect(updateWorkspace("alice", "ws-a", { name: "New name" })).rejects.toThrow("denied");
    await expect(fetchWorkspaces("alice")).rejects.toThrow("denied");
    await expect(saveBrainProfile("alice", "ws-a", emptyBrainProfile())).rejects.toThrow("denied");
    expect(localStorage.getItem("maro:ws-brain:ws-a")).toBeNull();
  });

  it("recovers an older failed-save cache once without replacing confirmed server data", () => {
    const old = emptyBrainProfile(); old.brand.name = "Previously filled";
    localStorage.setItem("maro:ws-brain:ws-a", JSON.stringify(old));
    const remote = emptyBrainProfile(); remote.brand.name = "Confirmed on server";
    expect(recoverLegacyBrainDraft("alice", "ws-a", remote)).toBeNull();
    expect(recoverLegacyBrainDraft("alice", "ws-a", emptyBrainProfile())).toEqual(old);
    expect(readBrainDraft("alice", "ws-a")).toEqual(old);
    clearSavedBrainDraft("alice", "ws-a", old);
    expect(recoverLegacyBrainDraft("alice", "ws-a", emptyBrainProfile())).toBeNull();
  });

  it("serializes autosaves and makes tool reads wait for the newest saved profile", async () => {
    let release: (() => void) | undefined;
    let persisted = emptyBrainProfile();
    const patches: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        const input = JSON.parse(String(init.body));
        patches.push(input.brain_profile.brand.name);
        if (patches.length === 1) await new Promise<void>((resolve) => { release = resolve; });
        persisted = input.brain_profile;
        return new Response(JSON.stringify({ id: "ws-a" }), { status: 200 });
      }
      return new Response(JSON.stringify({ brain_profile: persisted }), { status: 200 });
    }));
    const { saveBrainProfile, fetchBrainProfile } = await import("@/lib/workspaces/brainService");
    const first = emptyBrainProfile(); first.brand.name = "First";
    const newest = emptyBrainProfile(); newest.brand.name = "Newest";
    const savingFirst = saveBrainProfile("alice", "ws-a", first);
    await vi.waitFor(() => expect(release).toBeDefined());
    const savingNewest = saveBrainProfile("alice", "ws-a", newest);
    const reading = fetchBrainProfile("alice", "ws-a");
    expect(patches).toEqual(["First"]);
    release!();
    await Promise.all([savingFirst, savingNewest]);
    const loaded = await reading;
    expect(patches).toEqual(["First", "Newest"]);
    expect(loaded.brand.name).toBe("Newest");
    expect(isBrainConfigured(loaded)).toBe(true);
  });

  it("ends an indefinitely pending request and aborts it without changing a draft", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const profile = emptyBrainProfile(); profile.brand.name = "Keep me";
    writeBrainDraft("alice", "ws-a", profile);
    const request = workspaceRequest((s) => { signal = s; return new Promise<void>(() => {}); });
    const result = expect(request).rejects.toThrow("workspace_timeout");
    await vi.advanceTimersByTimeAsync(30_000);
    await result;
    expect(signal?.aborted).toBe(true);
    expect(readBrainDraft("alice", "ws-a")).toEqual(profile);
  });
});
