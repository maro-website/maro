import { describe, expect, it } from "vitest";
import { brainRetentionView } from "@/lib/workspaces/brainRetentionView";

const day = 24 * 60 * 60 * 1000;
const deadline = "2026-11-18T12:00:00Z";
const end = Date.parse(deadline);

describe("Brain retention presentation", () => {
  it("uses the server deadline to show the real remaining days and progress", () => {
    const view = brainRetentionView(deadline, null, end - 47 * day);
    expect(view).toMatchObject({ kind: "retained", daysLeft: 47, elapsedDays: 13, startedAt: end - 60 * day, deadline: end });
    expect(view.progress).toBeCloseTo(13 / 60 * 100);
  });
  it("rounds a partial final day up without saying the reset already happened", () => {
    expect(brainRetentionView(deadline, null, end - 1)).toMatchObject({ kind: "retained", daysLeft: 1, elapsedDays: 59 });
  });
  it.each([0, day])("shows zero at/past the deadline without claiming a confirmed reset: %s", delta => {
    expect(brainRetentionView(deadline, null, end + delta)).toMatchObject({ kind: "due", daysLeft: 0, elapsedDays: 60, progress: 100 });
  });
  it("does not invent a countdown or confuse a new profile with a reset", () => {
    expect(brainRetentionView(null, null, end)).toMatchObject({ kind: "new", deadline: null, daysLeft: null });
    expect(brainRetentionView(null, deadline, end)).toMatchObject({ kind: "reset", deadline: null, daysLeft: null });
    expect(brainRetentionView("invalid", null, end)).toMatchObject({ kind: "new", deadline: null, daysLeft: null });
  });
  it("clamps the meter for a clock before the retention window", () => {
    expect(brainRetentionView(deadline, null, end - 61 * day)).toMatchObject({ daysLeft: 60, elapsedDays: 0, progress: 0 });
  });
});
