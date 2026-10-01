import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import { isBrainConfigured } from "@/lib/workspaces/brainProfile";
import { readBrainDraft, writeBrainDraft, clearSavedBrainDraft, recoverLegacyBrainDraft } from "@/lib/workspaces/brainDraft";
import { workspaceRequest } from "@/lib/workspaces/request";
import { subscribeToSession } from "@/lib/supabase/sessionSubscription";

const mocks = vi.hoisted(() => ({ client: null as ReturnType<typeof createClient> | null }));
vi.mock("@/lib/supabase/client", () => ({
  supabaseConfigured: true,
  getSupabaseBrowser: () => mocks.client,
  getAccessToken: async () => "test-token",
}));
vi.mock("@/lib/services/projectAssetService", () => ({ resolvePrivateAssetRefs: async () => ({}) }));

beforeEach(() => {
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
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "denied", code: "42501" }), { status: 403 })));
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
