import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/security/headers";
import { startVisiblePoll } from "@/lib/services/visiblePoll";

describe("tab focus stability", () => {
  const store = readFileSync(resolve(process.cwd(), "src/context/store.tsx"), "utf8");
  const notices = readFileSync(
    resolve(process.cwd(), "src/components/app/PlatformNotices.tsx"),
    "utf8"
  );
  const settings = readFileSync(
    resolve(process.cwd(), "src/lib/hooks/useSettings.ts"),
    "utf8"
  );

  it("does not start global data refreshes whenever browser focus changes", () => {
    for (const source of [store, notices]) {
      expect(source).not.toContain('addEventListener("focus"');
    }
    expect(store).not.toContain('addEventListener("visibilitychange"');
  });

  it("stops polling while hidden and resumes its timer without an immediate refresh", () => {
    vi.useFakeTimers();
    const page = Object.assign(new EventTarget(), { hidden: false });
    const timers = {
      setInterval: setInterval as unknown as Window["setInterval"],
      clearInterval: clearInterval as unknown as Window["clearInterval"],
    };
    const refresh = vi.fn();
    const stop = startVisiblePoll(page, timers, refresh, 30_000);
    try {
      expect(refresh).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(30_000);
      expect(refresh).toHaveBeenCalledTimes(2);
      page.hidden = true; page.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(120_000);
      expect(refresh).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
      page.hidden = false; page.dispatchEvent(new Event("visibilitychange"));
      expect(refresh).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(30_000);
      expect(refresh).toHaveBeenCalledTimes(3);
      stop(); page.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(60_000);
      expect(refresh).toHaveBeenCalledTimes(3);
      expect(vi.getTimerCount()).toBe(0);
    } finally { stop(); vi.useRealTimers(); }
  });

  it("memoizes the user object across unrelated context updates", () => {
    expect(store).toContain("const user = useMemo(() => {");
    expect(store).toContain("}, [profile, avatarUrl]);");
  });

  it("allows React Fast Refresh without weakening the production CSP", () => {
    expect(buildContentSecurityPolicy({ isProduction: false })).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy({ isProduction: true })).not.toContain("'unsafe-eval'");
  });

  it("hydrates settings from a deterministic server/client initial state", () => {
    const initializer = settings.match(
      /function initialSettingsState\(\): SettingsState \{([\s\S]*?)\n\}/
    )?.[1];
    expect(initializer).toBeTruthy();
    expect(initializer).not.toContain("readCachedPublicSettings");
    expect(settings).toContain("React.useLayoutEffect");
    expect(settings).toContain("const cached = readCachedPublicSettings();");
  });
});
