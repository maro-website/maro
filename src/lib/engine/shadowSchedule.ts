/**
 * Schedule shadow compilation reliably after the HTTP response on serverless.
 * Falls back to fire-and-forget when `after()` is unavailable (tests).
 */

import type { ShadowCompileInput } from "./shadowCompile";

type AfterFn = (task: () => void | Promise<void>) => void;

let afterFn: AfterFn | null = null;

/** Test hook — inject mock `after`. */
export function setShadowAfterHook(fn: AfterFn | null): void {
  afterFn = fn;
}

async function loadAfter(): Promise<AfterFn | null> {
  if (afterFn) return afterFn;
  try {
    const mod = await import("next/server");
    if (typeof mod.after === "function") return mod.after as AfterFn;
  } catch {
    /* tests / non-next runtime */
  }
  return null;
}

export async function scheduleShadowCompilationReliable(
  run: (input: ShadowCompileInput) => Promise<unknown>,
  input: ShadowCompileInput
): Promise<void> {
  const task = () => {
    void run(input).catch((e) => {
      console.error("[shadow] reliable schedule failed:", e);
    });
  };

  const after = await loadAfter();
  if (after) {
    after(task);
    return;
  }

  task();
}
