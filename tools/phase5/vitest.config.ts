import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "../../src"), "server-only": path.resolve(__dirname, "../../src/lib/__tests__/mocks/server-only.ts") } },
  test: { environment: "node", include: [process.env.MARO_PHASE5_RECOVER === "1" ? "tools/phase5/recover.verify.ts" : "tools/phase5/live.verify.ts"], setupFiles: [], fileParallelism: false, testTimeout: 180_000 },
});
