import { describe, expect, it } from "vitest";
import { decodeJwtAal, roleRequiresMfa } from "@/lib/admin/mfaPolicy";
import { hasPermission, resolveAccessRole } from "@/lib/admin/permissions";
import { canExecuteEngineProvider } from "@/lib/engine/adapters/executeGate";
import { PRESET_REVEAL_DISABLED } from "@/lib/presets/policy";

describe("RC gap closure — MFA policy", () => {
  it("requires MFA for privileged roles only", () => {
    expect(roleRequiresMfa("super_admin")).toBe(true);
    expect(roleRequiresMfa("administrator")).toBe(true);
    expect(roleRequiresMfa("developer")).toBe(true);
    expect(roleRequiresMfa("editor")).toBe(false);
  });

  it("decodes aal claim from jwt payload", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ aal: "aal2", sub: "x" })).toString("base64url");
    expect(decodeJwtAal(`${header}.${payload}.sig`)).toBe("aal2");
  });
});

describe("RC gap closure — RBAC", () => {
  it("editor can manage help content", () => {
    expect(hasPermission("editor", "help.manage")).toBe(true);
    expect(hasPermission("editor", "security.manage")).toBe(false);
  });

  it("legacy is_admin resolves to super_admin", () => {
    expect(resolveAccessRole({ is_admin: true })).toBe("super_admin");
  });
});

describe("RC gap closure — production freeze", () => {
  it("preset reveal permanently disabled at policy layer", () => {
    expect(PRESET_REVEAL_DISABLED).toBe(true);
  });

  it("engine provider execution remains blocked without live flag", () => {
    expect(canExecuteEngineProvider({ pipeline: "engine", promptCompilerV2: false })).toBe(false);
    expect(canExecuteEngineProvider({ pipeline: "shadow", promptCompilerV2: false })).toBe(false);
  });
});
