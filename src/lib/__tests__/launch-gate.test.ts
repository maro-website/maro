import { describe, expect, it } from "vitest";
import {
  isComingSoonMode,
  isLaunchPublicRoute,
  resolvePublicLaunchMode,
} from "@/lib/launch/config";
import {
  isValidLaunchEmail,
  normalizeLaunchEmail,
} from "@/lib/launch/waitlist";

describe("public launch configuration", () => {
  it("only enables the gate for the explicit coming_soon value", () => {
    expect(resolvePublicLaunchMode("coming_soon")).toBe("coming_soon");
    expect(resolvePublicLaunchMode(" COMING_SOON ")).toBe("coming_soon");
    expect(resolvePublicLaunchMode("live")).toBe("live");
    expect(resolvePublicLaunchMode("unexpected")).toBe("live");
    expect(isComingSoonMode("coming_soon")).toBe(true);
    expect(isComingSoonMode("live")).toBe(false);
  });

  it("keeps only launch and authentication infrastructure public", () => {
    expect(isLaunchPublicRoute("/coming-soon")).toBe(true);
    expect(isLaunchPublicRoute("/sign-in")).toBe(true);
    expect(isLaunchPublicRoute("/forgot-password")).toBe(true);
    expect(isLaunchPublicRoute("/auth/callback")).toBe(true);
    expect(isLaunchPublicRoute("/api/launch-waitlist")).toBe(true);
    expect(isLaunchPublicRoute("/api/auth/signup")).toBe(true);
    expect(isLaunchPublicRoute("/api/webhooks/supabase/auth-email")).toBe(true);
    expect(isLaunchPublicRoute("/")).toBe(false);
    expect(isLaunchPublicRoute("/web")).toBe(false);
    expect(isLaunchPublicRoute("/api/prompts")).toBe(false);
  });
});

describe("launch waitlist email validation", () => {
  it("normalizes valid emails", () => {
    expect(normalizeLaunchEmail("  Person@Example.COM ")).toBe("person@example.com");
    expect(isValidLaunchEmail("person+early@example.com")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidLaunchEmail("person")).toBe(false);
    expect(isValidLaunchEmail("person@@example.com")).toBe(false);
    expect(isValidLaunchEmail(".person@example.com")).toBe(false);
    expect(isValidLaunchEmail("person@example")).toBe(false);
    expect(isValidLaunchEmail("person@-example.com")).toBe(false);
    expect(isValidLaunchEmail(`${"a".repeat(65)}@example.com`)).toBe(false);
  });
});

