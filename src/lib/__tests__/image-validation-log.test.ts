import { afterEach, describe, expect, it, vi } from "vitest";
import { logImageValidation } from "@/lib/generation/imageValidationLog";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";

afterEach(() => vi.restoreAllMocks());
describe("private-safe image validation logs", () => {
  it("never logs private exception messages or attacker-controlled unknown field names", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logImageValidation({ requestId: "request-1", userPromptLength: 8000 },
      new ImageRequestValidationError("unknown_field", 400, "request.PRIVATE PROMPT"));
    logImageValidation({ requestId: "request-2" }, new Error("PRIVATE PROVIDER MESSAGE"));
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ code: "unknown_field", field: "request", jobId: null,
      userPromptLength: 8000, compiledPromptLength: null, model: null, hasReferences: null });
  });
});
