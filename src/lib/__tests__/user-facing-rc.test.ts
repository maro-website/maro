import { describe, expect, it, vi, afterEach } from "vitest";
import { PLAN_PACKAGES } from "@/lib/credits/money";
import { getProviderCostFallbackMaximumUsd } from "@/lib/cost/fallbackMaximums";
import { TOP_BAR_DESTINATIONS, NAV_DESTINATIONS } from "@/lib/nav/destinations";
import { PRESET_REVEAL_DISABLED } from "@/lib/presets/policy";
import { getTool } from "@/lib/tools/registry";
import { paymentMode } from "@/lib/config/features";
import { isSignupEnabled } from "@/lib/config/features";

describe("User-facing RC — terminology", () => {
  it("plan features reference maroPresets not maroPrompts", () => {
    const copy = PLAN_PACKAGES.flatMap((p) => p.features.map((f) => f.text)).join(" ");
    expect(copy).toContain("maroPresets");
    expect(copy).not.toContain("maroPrompts");
  });

  it("registry names presets product maroPresets", () => {
    expect(getTool("prompte")?.name).toBe("maroPresets");
  });

  it("uses maroAudio publicly while preserving the canonical legacy tool id", () => {
    const audio = TOP_BAR_DESTINATIONS.find((destination) => destination.id === "audio");
    expect(audio?.label).toBe("maroAudio");
    expect(audio?.route).toBe("/audio");
    expect(audio?.toolId).toBe("zo");
  });
});

describe("User-facing RC — navigation IA", () => {
  it("krijimet appears once in drawer destinations (hub menu only)", () => {
    const krijimetInNav = NAV_DESTINATIONS.filter((d) => d.route === "/krijimet");
    expect(krijimetInNav).toHaveLength(0);
  });

  it("presets route is /prompts labeled maroPresets", () => {
    const presets = TOP_BAR_DESTINATIONS.find((d) => d.id === "presets");
    expect(presets?.route).toBe("/prompts");
    expect(presets?.label).toBe("maroPresets");
  });
});

describe("User-facing RC — preset reveal policy", () => {
  it("preset reveal remains disabled", () => {
    expect(PRESET_REVEAL_DISABLED).toBe(true);
  });
});

describe("User-facing RC — provider cost fallbacks", () => {
  it("uses conservative maximums for core generators", () => {
    expect(getProviderCostFallbackMaximumUsd("reklama")).toBe(0.35);
    expect(getProviderCostFallbackMaximumUsd("logo")).toBe(0.35);
    expect(getProviderCostFallbackMaximumUsd("website")).toBe(2.5);
  });
});

describe("User-facing RC — registration gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("public signup disabled unless NEXT_PUBLIC_SIGNUP_ENABLED=true", () => {
    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "");
    expect(isSignupEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "true");
    expect(isSignupEnabled()).toBe(true);
  });
});

describe("User-facing RC — payment mode default", () => {
  it("defaults to test payment (Raiffeisen live blocked)", () => {
    expect(paymentMode()).toBe("test");
  });
});
