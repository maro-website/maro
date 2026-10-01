import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { THEME_INIT_SCRIPT } from "../../../security-headers.mjs";
import { THEME_OWNER_KEY, themePreferenceKey } from "../../../theme-preferences.mjs";

function boot(entries: Record<string, string> = {}, blocked = false) {
  const attributes: Record<string, string> = {};
  const meta: Record<string, string> = {};
  runInNewContext(THEME_INIT_SCRIPT, {
    localStorage: { getItem: (key: string) => { if (blocked) throw new Error("Storage denied"); return entries[key] ?? null; } },
    document: { documentElement: { setAttribute: (key: string, value: string) => { attributes[key] = value; } },
      querySelector: () => ({ setAttribute: (key: string, value: string) => { meta[key] = value; } }) },
  });
  return { theme: attributes["data-theme"], color: meta.content };
}

describe("theme first paint and persisted user choice", () => {
  it("defaults new users to Mshelt before paint", () => {
    expect(boot()).toEqual({ theme: "mshelt", color: "#111315" });
  });
  it("ignores the former forced light-only value", () => {
    expect(boot({ "maro.theme": "qelt" }).theme).toBe("mshelt");
  });
  it("restores a user's explicit Qelt choice after reload", () => {
    expect(boot({ [THEME_OWNER_KEY]: "user-a", [themePreferenceKey("user-a")]: "qelt" })).toEqual({ theme: "qelt", color: "#F9F9F9" });
  });
  it("keeps another user's Qelt choice from changing the new user's default", () => {
    expect(boot({ [THEME_OWNER_KEY]: "user-b", [themePreferenceKey("user-a")]: "qelt" }).theme).toBe("mshelt");
  });
  it("falls back to dark when storage is blocked or a choice is invalid", () => {
    expect(boot({}, true).theme).toBe("mshelt");
    expect(boot({ [themePreferenceKey()]: "unexpected" }).theme).toBe("mshelt");
  });
  it("restores Mshelt after a user switches back", () => {
    expect(boot({ [THEME_OWNER_KEY]: "user-a", [themePreferenceKey("user-a")]: "mshelt" }).theme).toBe("mshelt");
  });
});
