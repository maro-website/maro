import { describe, expect, it } from "vitest";
import { formatCredits } from "@/lib/credits/format";

describe("formatCredits", () => {
  it.each([
    [0, "0"],
    [3, "3"],
    [3000, "3000"],
    [12500, "12500"],
    [-3000, "-3000"],
  ])("renders %s without thousands separators", (value, expected) => {
    expect(formatCredits(value)).toBe(expected);
    expect(formatCredits(value)).not.toMatch(/[.,]/);
  });

  it("fails safe for a non-finite value", () => {
    expect(formatCredits(Number.NaN)).toBe("0");
  });
});
