import { describe, expect, it } from "vitest";
import { isNoticeEligible, NOTICE_DISMISSAL_TTL_MS } from "@/lib/notifications/active";

describe("notification eligibility", () => {
  const now = Date.parse("2026-08-21T12:00:00.000Z");

  it("keeps module targeting isolated", () => {
    expect(isNoticeEligible({ targets: ["maroImazh"], moduleId: "maroImazh", now })).toBe(true);
    expect(isNoticeEligible({ targets: ["maroImazh"], moduleId: "maroWeb", now })).toBe(false);
    expect(isNoticeEligible({ targets: ["all"], moduleId: "maroWeb", now })).toBe(true);
  });

  it("hides a dismissal for 24 hours and makes it eligible afterward", () => {
    const dismissedAt = new Date(now - NOTICE_DISMISSAL_TTL_MS + 1).toISOString();
    expect(isNoticeEligible({ targets: ["all"], moduleId: "platform", dismissedAt, now })).toBe(false);
    expect(isNoticeEligible({ targets: ["all"], moduleId: "platform", dismissedAt, now: now + 1 })).toBe(true);
  });
});
