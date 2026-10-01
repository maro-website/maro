import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deriveMembershipStatus,
  isActivePlanStatus,
  renewalAlreadyFulfilledForCycle,
} from "@/lib/commerce/memberships";

describe("deriveMembershipStatus", () => {
  const base = {
    plan_id: "standard" as const,
    suspended: false,
    renewal_window_days: 7,
  };

  it("returns EXPIRED when expires_at is in the past", () => {
    const status = deriveMembershipStatus(
      { ...base, expires_at: "2020-01-01T00:00:00.000Z" },
      new Date("2026-01-01T00:00:00.000Z")
    );
    expect(status).toBe("EXPIRED");
  });

  it("returns ACTIVE when outside renewal window", () => {
    const status = deriveMembershipStatus(
      { ...base, expires_at: "2026-02-01T00:00:00.000Z" },
      new Date("2026-01-01T00:00:00.000Z")
    );
    expect(status).toBe("ACTIVE");
  });

  it("returns RENEWAL_WINDOW in final 7 days", () => {
    const status = deriveMembershipStatus(
      { ...base, expires_at: "2026-01-05T00:00:00.000Z" },
      new Date("2026-01-01T00:00:00.000Z")
    );
    expect(status).toBe("RENEWAL_WINDOW");
  });

  it("returns NO_PLAN semantics via isActivePlanStatus for expired", () => {
    expect(isActivePlanStatus("EXPIRED")).toBe(false);
    expect(isActivePlanStatus("RENEWAL_WINDOW")).toBe(true);
    expect(isActivePlanStatus("ACTIVE")).toBe(true);
  });

  it("detects duplicate renewal in same cycle", () => {
    const membership = {
      expires_at: "2026-02-01T00:00:00.000Z",
      cycle_renewal_fulfilled_at: "2026-01-28T00:00:00.000Z",
      renewal_window_days: 7,
    };
    expect(renewalAlreadyFulfilledForCycle(membership)).toBe(true);
  });
});

describe("cron must not be security boundary", () => {
  it("expired membership is EXPIRED even if persisted_status stale", () => {
    const status = deriveMembershipStatus(
      {
        plan_id: "pro",
        suspended: false,
        renewal_window_days: 7,
        expires_at: "2020-01-01T00:00:00.000Z",
      },
      new Date("2026-08-20T00:00:00.000Z")
    );
    expect(status).toBe("EXPIRED");
    expect(isActivePlanStatus(status)).toBe(false);
  });
});
