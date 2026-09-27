import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/security/headers";

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
      expect(source).not.toContain('addEventListener("visibilitychange"');
    }
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
