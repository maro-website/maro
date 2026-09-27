import { defineConfig } from "vitest/config";
import path from "node:path";

// Explicit opt-in integration harness, excluded from the normal regression suite.
export default defineConfig({
  resolve: { alias: {
    "@": path.resolve(__dirname, "../../src"),
    "server-only": path.resolve(__dirname, "../../src/lib/__tests__/mocks/server-only.ts"),
  } },
  test: { environment: "node", include: ["tools/phase3/live.verify.ts"],
    setupFiles: [], fileParallelism: false, testTimeout: 1_800_000 },
});
