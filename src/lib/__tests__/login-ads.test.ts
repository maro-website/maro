import { describe, expect, it } from "vitest";
import { isSafeExternalUrl } from "@/lib/loginAds/types";

describe("login ad external links", () => {
  it("accepts complete http and https links", () => {
    expect(isSafeExternalUrl("https://example.com/campaign")).toBe(true);
    expect(isSafeExternalUrl("http://localhost:3000/preview")).toBe(true);
  });

  it("rejects unsafe and incomplete links", () => {
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("data:text/html,hello")).toBe(false);
    expect(isSafeExternalUrl("example.com")).toBe(false);
    expect(isSafeExternalUrl("https://")).toBe(false);
  });
});
