import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "../../src"), "server-only": path.resolve(__dirname, "../../src/lib/__tests__/mocks/server-only.ts") } },
  test: { environment: "node", include: ["tools/phase4/verify.ts"], setupFiles: [], fileParallelism: false, testTimeout: 1_200_000 },
});
