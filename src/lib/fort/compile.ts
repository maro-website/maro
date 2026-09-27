// maroFort — brief compilation seam. Deterministic/identity for now; this is the
// single place to plug an LLM "brief compiler" later without touching callers.

export interface CompiledBrief {
  text: string;
  compiledByLLM: boolean;
}

export function compileBrief(briefText: string): CompiledBrief {
  return { text: briefText, compiledByLLM: false };
}
