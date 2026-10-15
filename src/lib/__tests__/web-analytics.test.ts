import { afterEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_KEY, CONSENT_MAX_AGE_MS, parseAnalyticsConsent } from "@/lib/analytics/consent";
import { analyticsPage, analyticsReferrer, createAnalyticsTracker, DENIED_CONSENT } from "@/lib/analytics/web";
import { buildContentSecurityPolicy } from "@/lib/security/headers";

afterEach(() => { vi.unstubAllEnvs(); });

describe("GA4 consent and private data boundary", () => {
  it("requires fresh, versioned consent, never an old notice dismissal", () => {
    const now = 1_800_000_000_000;
    for (const value of [null, "1", "true", "{}", "invalid", JSON.stringify({ version: 0, analytics: "granted", savedAt: now })]) expect(parseAnalyticsConsent(value, now)).toBeNull();
    for (const analytics of ["granted", "denied"]) {
      expect(parseAnalyticsConsent(JSON.stringify({ version: 1, analytics, savedAt: now }), now)).toBe(analytics);
      expect(parseAnalyticsConsent(JSON.stringify({ version: 1, analytics, savedAt: now - CONSENT_MAX_AGE_MS }), now)).toBeNull();
      expect(parseAnalyticsConsent(JSON.stringify({ version: 1, analytics, savedAt: now + 1 }), now)).toBeNull();
    }
    expect(ANALYTICS_CONSENT_KEY).not.toContain("notice");
  });

  it("allows static routes while discarding queries and fragments", () => {
    expect(analyticsPage("/imazh?prompt=private&email=person@example.com#secret")).toEqual({ page_location: "https://maro.al/imazh", page_title: "maro.al - Imazh", page_path: "/imazh" });
    for (const path of ["/admin", "/admin/users", "/account", "/account/workspaces/private", "/checkout", "/order/success", "/pay/raiaccept/return", "/oauth/consent", "/reset-password", "/forgot-password", "/confirm-email", "/projects/secret/editor", "/u/person@example.com", "/c/private", "/r/private", "/unknown"]) expect(analyticsPage(path)).toBeNull();
  });

  it("keeps only acquisition origins and safe internal referrers", () => {
    expect(analyticsReferrer("https://www.google.com/search?q=private#x")).toBe("https://www.google.com/");
    expect(analyticsReferrer("https://user:password@example.com/private?email=secret")).toBe("https://example.com/");
    expect(analyticsReferrer("https://maro.al/account?email=private")).toBe("https://maro.al/");
    expect(analyticsReferrer("https://www.maro.al/presets?prompt=private")).toBe("https://maro.al/presets");
    for (const url of ["", "javascript:alert(1)", "file:///private"]) expect(analyticsReferrer(url)).toBe("");
  });

  function harness() {
    let allowed = false;
    let pathname = "/";
    const command = vi.fn();
    const load = vi.fn();
    const disabled = vi.fn();
    const tracker = createAnalyticsTracker("G-TEST123", { allowed: () => allowed, pathname: () => pathname, command, load, disabled, referrer: "https://google.com/search?q=private" });
    return { tracker, command, load, disabled, consent(value: boolean) { allowed = value; }, route(value: string) { pathname = value; } };
  }

  it("makes no commands or script load before opt-in, including refusal", () => {
    const h = harness();
    h.tracker.sync(); h.route("/presets"); h.tracker.sync();
    expect(h.command).not.toHaveBeenCalled(); expect(h.load).not.toHaveBeenCalled();
    expect(h.disabled).toHaveBeenLastCalledWith(true);
  });

  it("sets denied advertising and sanitized config before loading, with one page view per route", () => {
    const h = harness(); h.consent(true); h.tracker.sync(); h.tracker.sync();
    expect(h.command.mock.calls[0]).toEqual(["consent", "default", DENIED_CONSENT]);
    const configCall = h.command.mock.calls.find(call => call[0] === "config")!;
    expect(configCall[2]).toMatchObject({ send_page_view: false, page_location: "https://maro.al/", page_referrer: "https://google.com/", allow_google_signals: false, allow_ad_personalization_signals: false, cookie_update: false });
    expect(h.command.mock.invocationCallOrder[h.command.mock.calls.indexOf(configCall)]).toBeLessThan(h.load.mock.invocationCallOrder[0]);
    h.route("/imazh?prompt=PRIVATE#PRIVATE"); h.tracker.sync();
    h.route("/imazh?prompt=OTHER"); h.tracker.sync();
    const views = h.command.mock.calls.filter(call => call[0] === "event");
    expect(views).toHaveLength(2);
    expect(h.command.mock.calls.filter(call => call[0] === "config").at(-1)?.[2]).toMatchObject({ page_location: "https://maro.al/imazh", send_page_view: false });
    expect(views[1][2]).toMatchObject({ page_location: "https://maro.al/imazh", page_referrer: "https://maro.al/" });
    expect(JSON.stringify(h.command.mock.calls)).not.toContain("PRIVATE");
    expect(h.load).toHaveBeenCalledTimes(1);
  });

  it("pauses on private pages and withdrawal, and resumes with a fresh safe view", () => {
    const h = harness(); h.consent(true); h.tracker.sync();
    const count = h.command.mock.calls.length;
    h.route("/admin/users"); h.tracker.sync();
    expect(h.disabled).toHaveBeenLastCalledWith(true); expect(h.command).toHaveBeenCalledTimes(count);
    h.route("/pricing"); h.consent(false); h.tracker.sync();
    expect(h.disabled).toHaveBeenLastCalledWith(true); expect(h.command).toHaveBeenCalledTimes(count);
    h.consent(true); h.tracker.sync(); expect(h.disabled).toHaveBeenLastCalledWith(false);
    expect(h.command.mock.calls.at(-1)?.[2]).toMatchObject({ page_location: "https://maro.al/pricing" });
    expect(JSON.stringify(h.command.mock.calls)).not.toContain("admin");
  });

  it("does not install for a malformed measurement id", () => {
    const load = vi.fn(); const command = vi.fn();
    const tracker = createAnalyticsTracker("not-ga", { allowed: () => true, pathname: () => "/", load, command, disabled: vi.fn(), referrer: "" });
    tracker.sync(); expect(load).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled();
  });

  it("adds only exact analytics CSP hosts when configured, preserving the production nonce", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    expect(buildContentSecurityPolicy({ isProduction: true })).not.toContain("googletagmanager");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    const csp = buildContentSecurityPolicy({ isProduction: true, nonce: "test-nonce" });
    expect(csp).toContain("'nonce-test-nonce'");
    expect(csp).toContain("https://www.googletagmanager.com"); expect(csp).toContain("https://region1.google-analytics.com");
    expect(csp).not.toContain("unsafe-eval"); expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("*.google.com"); expect(csp).not.toContain("doubleclick");
  });
});
