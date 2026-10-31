import { afterEach, describe, expect, it, vi } from "vitest";
import { assembleMasterprompt, contextBudget, estimateOptimizerUsd, MASTERPROMPT_MAX_CHARS, optimizerEnabled,
  optimizerReservationUsd, parseOptimizedContext, type OptimizationSource } from "@/lib/prompt-optimizer/model";

const source: OptimizationSource = { engine: "PRIVATE ENGINE: Keep reference labels unchanged.", facts: 'Brand: Maro; language: shqip; colors: #11ab22; Avoid: invented discounts.',
  context: "LONG BRAND HISTORY. ".repeat(2000), request: 'Shkruaj saktë: “Kafe e mirë — 2,50 €”.' };
afterEach(() => vi.unstubAllEnvs());
describe("masterprompt contracts", () => {
  it("keeps engine, constraints and user text byte-for-byte, fitting the final assembled prompt", () => {
    const prompt = parseOptimizedContext(JSON.stringify({ context: "Coffee pack, warm daylight, calm editorial setting." }), source, contextBudget(source));
    expect(prompt.startsWith(source.engine)).toBe(true);
    expect(prompt).toContain(source.facts);
    expect(prompt.endsWith(source.request)).toBe(true);
    expect(prompt.length).toBeLessThanOrEqual(MASTERPROMPT_MAX_CHARS);
    expect(source.context.length).toBeGreaterThan(32000);
  });
  it("uses the remaining real character budget and never truncates provider output", () => {
    const large = { ...source, engine: "x".repeat(29500) };
    const budget = contextBudget(large);
    expect(budget).toBeLessThan(500);
    expect(assembleMasterprompt(large, "y".repeat(budget)).length).toBeLessThanOrEqual(30000);
    expect(() => parseOptimizedContext(JSON.stringify({ context: "y".repeat(budget + 1) }), large, budget)).toThrow();
  });
  it.each(['not JSON', '{"context":""}', '{"context":[]}', '{"context":"abc","secret":"leak"}', 'null', '[]'])
    ("rejects invalid, empty and non-schema output: %s", output => expect(() => parseOptimizedContext(output, source, 1000)).toThrow());
  it("separates cached input and counts all output tokens including reasoning", () => {
    expect(estimateOptimizerUsd({ input_tokens: 10000, output_tokens: 1000, input_tokens_details: { cached_tokens: 4000 } }))
      .toEqual({ input: 10000, cached: 4000, writes: 0, output: 1000, usd: 0.0224 });
    expect(estimateOptimizerUsd({ input_tokens: 12000, output_tokens: 1000, input_tokens_details: { cached_tokens: 4000, cache_write_tokens: 7000 } }).usd).toBe(0.0299);
    expect(optimizerReservationUsd("é".repeat(20000))).toBeGreaterThanOrEqual(0.18);
    expect(() => estimateOptimizerUsd({ input_tokens: 2, output_tokens: 3, input_tokens_details: { cached_tokens: 4 } })).toThrow();
    expect(() => estimateOptimizerUsd({ input_tokens: 300000, output_tokens: 3 })).toThrow();
  });
  it("requires explicit opt-in for the exact model family and authenticated pilot user", () => {
    vi.stubEnv("MARO_OPTIMIZER_AUDIENCE", "allowlist");
    vi.stubEnv("OPENAI_API_KEY", "different-key");
    vi.stubEnv("MARO_OPTIMIZER_ENABLED", "true");
    vi.stubEnv("MARO_OPTIMIZER_USER_IDS", "owner");
    vi.stubEnv("MARO_OPTIMIZER_OPENAI_API_KEY", "");
    expect(optimizerEnabled("owner", "gpt-image-2")).toBe(true);
    vi.stubEnv("MARO_OPTIMIZER_OPENAI_API_KEY", "dedicated-test-key");
    expect(optimizerEnabled("owner", "gpt-image-2")).toBe(true);
    expect(optimizerEnabled("someone-else", "gpt-image-2")).toBe(false);
    expect(optimizerEnabled("owner", "recraftv4")).toBe(false);
    vi.stubEnv("MARO_OPTIMIZER_ENABLED", "false");
    expect(optimizerEnabled("owner", "gpt-image-2")).toBe(false);
  });
  it("enables current and future authenticated users in the all-user audience, retaining model and pause gates", () => {
    vi.stubEnv("MARO_OPTIMIZER_ENABLED", "true");
    vi.stubEnv("MARO_OPTIMIZER_AUDIENCE", "all");
    vi.stubEnv("MARO_OPTIMIZER_USER_IDS", "owner");
    for (const id of ["owner", "another-user", "new-account"]) expect(optimizerEnabled(id, "gpt-image-2")).toBe(true);
    expect(optimizerEnabled("", "gpt-image-2")).toBe(false);
    expect(optimizerEnabled("   ", "gpt-image-2")).toBe(false);
    expect(optimizerEnabled("another-user", "recraftv4")).toBe(false);
    vi.stubEnv("MARO_OPTIMIZER_ENABLED", "false");
    expect(optimizerEnabled("another-user", "gpt-image-2")).toBe(false);
  });
  it.each(["", "ALL", "unexpected"])("retains allowlist admission for an unset/unknown audience: %s", audience => {
    vi.stubEnv("MARO_OPTIMIZER_ENABLED", "true"); vi.stubEnv("MARO_OPTIMIZER_AUDIENCE", audience); vi.stubEnv("MARO_OPTIMIZER_USER_IDS", "owner");
    expect(optimizerEnabled("owner", "gpt-image-2")).toBe(true);
    expect(optimizerEnabled("another-user", "gpt-image-2")).toBe(false);
  });
});
