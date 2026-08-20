import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const hasDb = Boolean(url && serviceKey);

const billing = {
  fullName: "Smoke Test",
  email: "smoke@test.local",
  country: "AL",
  city: "Tirana",
  legalConsent: true,
};

function admin(): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function createTestUser(suffix: string): Promise<{ id: string; email: string }> {
  const email = `commerce-smoke-${suffix}-${Date.now()}@maro.test`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  return { id: data.user.id, email };
}

async function deleteTestUser(userId: string) {
  await admin().auth.admin.deleteUser(userId);
}

async function insertPendingOrder(
  userId: string,
  email: string,
  opts: {
    itemId: string;
    orderKind: string;
    credits: number;
    amountCents: number;
  }
): Promise<string> {
  const { data, error } = await admin()
    .from("credit_orders")
    .insert({
      user_id: userId,
      user_email: email,
      credits: opts.credits,
      amount_cents: opts.amountCents,
      currency: "EUR",
      status: "pending",
      provider: "test",
      item_type: opts.orderKind === "topup" ? "topup" : "plan",
      item_id: opts.itemId,
      order_kind: opts.orderKind,
      commercial_snapshot: { captured_at: new Date().toISOString(), order_kind: opts.orderKind },
      billing_snapshot: { ...billing, email },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function fulfill(orderId: string, providerTx?: string) {
  const { fulfillCommerceOrder } = await import("@/lib/payments/fulfill");
  return fulfillCommerceOrder(orderId, providerTx ?? null);
}

describe.skipIf(!hasDb)("commerce smoke integration (real DB)", () => {
  const users: string[] = [];

  afterAll(async () => {
    for (const id of users.reverse()) {
      await deleteTestUser(id).catch(() => undefined);
    }
  });

  it("Standard purchase: +100 credits, 30-day membership, entitlements", async () => {
    const user = await createTestUser("std");
    users.push(user.id);

    const orderId = await insertPendingOrder(user.id, user.email, {
      itemId: "standard",
      orderKind: "plan_purchase",
      credits: 100,
      amountCents: 900,
    });

    const first = await fulfill(orderId, `tx-std-${orderId}`);
    expect(first.ok).toBe(true);
    expect(first.already).toBeFalsy();
    expect(first.credits).toBe(100);

    const { resolveEntitlements } = await import("@/lib/commerce/entitlements");
    const ent = await resolveEntitlements(user.id);
    expect(ent.plan_id).toBe("standard");
    expect(ent.plan_status).toBe("ACTIVE");
    expect(ent.credits_balance).toBe(100);
    expect(ent.workspace_limit).toBe(1);

    const dup = await fulfill(orderId, `tx-std-${orderId}`);
    expect(dup.ok).toBe(true);
    expect(dup.already).toBe(true);

    const { data: profile } = await admin().from("profiles").select("credits").eq("id", user.id).single();
    expect(profile?.credits).toBe(100);
  });

  it("Pro purchase: +500 credits and entitlements", async () => {
    const user = await createTestUser("pro");
    users.push(user.id);

    const orderId = await insertPendingOrder(user.id, user.email, {
      itemId: "pro",
      orderKind: "plan_purchase",
      credits: 500,
      amountCents: 3500,
    });

    const result = await fulfill(orderId);
    expect(result.ok).toBe(true);
    expect(result.credits).toBe(500);

    const { resolveEntitlements } = await import("@/lib/commerce/entitlements");
    const ent = await resolveEntitlements(user.id);
    expect(ent.plan_id).toBe("pro");
    expect(ent.credits_balance).toBe(500);
    expect(ent.workspace_limit).toBe(5);
    expect(ent.concurrency_limit).toBe(3);
  });

  it("Top-up: rejects without active plan; succeeds with Standard and Pro", async () => {
    const noPlan = await createTestUser("topup-noplan");
    users.push(noPlan.id);

    const blockedOrder = await insertPendingOrder(noPlan.id, noPlan.email, {
      itemId: "topup-100",
      orderKind: "topup",
      credits: 100,
      amountCents: 900,
    });
    const blocked = await fulfill(blockedOrder);
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toBe("topup_requires_active_plan");

    const stdUser = await createTestUser("topup-std");
    users.push(stdUser.id);
    await fulfill(
      await insertPendingOrder(stdUser.id, stdUser.email, {
        itemId: "standard",
        orderKind: "plan_purchase",
        credits: 100,
        amountCents: 900,
      })
    );
    const stdTopup = await fulfill(
      await insertPendingOrder(stdUser.id, stdUser.email, {
        itemId: "topup-100",
        orderKind: "topup",
        credits: 100,
        amountCents: 900,
      })
    );
    expect(stdTopup.ok).toBe(true);

    const proUser = await createTestUser("topup-pro");
    users.push(proUser.id);
    await fulfill(
      await insertPendingOrder(proUser.id, proUser.email, {
        itemId: "pro",
        orderKind: "plan_purchase",
        credits: 500,
        amountCents: 3500,
      })
    );
    const proTopup = await fulfill(
      await insertPendingOrder(proUser.id, proUser.email, {
        itemId: "topup-200",
        orderKind: "topup",
        credits: 200,
        amountCents: 1700,
      })
    );
    expect(proTopup.ok).toBe(true);
  });

  it("Renewal: window gating, extend expiry, idempotent second fulfillment", async () => {
    const user = await createTestUser("renew");
    users.push(user.id);

    await fulfill(
      await insertPendingOrder(user.id, user.email, {
        itemId: "standard",
        orderKind: "plan_purchase",
        credits: 100,
        amountCents: 900,
      })
    );

    const { data: membership } = await admin()
      .from("memberships")
      .select("id, expires_at")
      .eq("user_id", user.id)
      .single();

    const farExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    await admin().from("memberships").update({ expires_at: farExpiry }).eq("user_id", user.id);

    const earlyRenew = await fulfill(
      await insertPendingOrder(user.id, user.email, {
        itemId: "standard",
        orderKind: "plan_renewal",
        credits: 100,
        amountCents: 900,
      })
    );
    expect(earlyRenew.ok).toBe(false);
    expect(earlyRenew.error).toBe("renewal_not_available");

    const windowExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await admin().from("memberships").update({ expires_at: windowExpiry, cycle_renewal_fulfilled_at: null }).eq("user_id", user.id);

    const renewOrder = await insertPendingOrder(user.id, user.email, {
      itemId: "standard",
      orderKind: "plan_renewal",
      credits: 100,
      amountCents: 900,
    });
    const renewed = await fulfill(renewOrder);
    expect(renewed.ok).toBe(true);

    const { data: after } = await admin()
      .from("memberships")
      .select("expires_at, cycle_renewal_fulfilled_at")
      .eq("user_id", user.id)
      .single();
    expect(new Date(after!.expires_at as string).getTime()).toBeGreaterThan(new Date(windowExpiry).getTime());

    const sameOrderAgain = await fulfill(renewOrder);
    expect(sameOrderAgain.ok).toBe(true);
    expect(sameOrderAgain.already).toBe(true);

    const windowAgain = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await admin()
      .from("memberships")
      .update({ expires_at: windowAgain })
      .eq("user_id", user.id);

    const dupRenewOrder = await insertPendingOrder(user.id, user.email, {
      itemId: "standard",
      orderKind: "plan_renewal",
      credits: 100,
      amountCents: 900,
    });
    const dupRenew = await fulfill(dupRenewOrder);
    expect(dupRenew.ok).toBe(false);
    expect(dupRenew.error).toBe("renewal_already_fulfilled");
  });

  it("Upgrade Standard→Pro: €26 / +400 credits, expiry not shortened", async () => {
    const user = await createTestUser("upgrade");
    users.push(user.id);

    await fulfill(
      await insertPendingOrder(user.id, user.email, {
        itemId: "standard",
        orderKind: "plan_purchase",
        credits: 100,
        amountCents: 900,
      })
    );

    const { data: before } = await admin()
      .from("memberships")
      .select("expires_at, plan_id")
      .eq("user_id", user.id)
      .single();

    const upgradeOrder = await insertPendingOrder(user.id, user.email, {
      itemId: "upgrade-pro",
      orderKind: "plan_upgrade",
      credits: 400,
      amountCents: 2600,
    });
    const upgraded = await fulfill(upgradeOrder);
    expect(upgraded.ok).toBe(true);

    const { data: profile } = await admin().from("profiles").select("credits, maro_plan").eq("id", user.id).single();
    expect(profile?.maro_plan).toBe("pro");
    expect(profile?.credits).toBe(500);

    const { data: after } = await admin()
      .from("memberships")
      .select("expires_at, plan_id")
      .eq("user_id", user.id)
      .single();
    expect(after?.plan_id).toBe("pro");
    expect(new Date(after!.expires_at as string).getTime()).toBe(
      new Date(before!.expires_at as string).getTime()
    );
  });

  it("Idempotency: same provider transaction twice → one fulfillment", async () => {
    const user = await createTestUser("idem");
    users.push(user.id);

    const orderA = await insertPendingOrder(user.id, user.email, {
      itemId: "standard",
      orderKind: "plan_purchase",
      credits: 100,
      amountCents: 900,
    });
    const tx = `shared-tx-${orderA}`;

    const r1 = await fulfill(orderA, tx);
    expect(r1.ok).toBe(true);

    const orderB = await insertPendingOrder(user.id, user.email, {
      itemId: "standard",
      orderKind: "plan_purchase",
      credits: 100,
      amountCents: 900,
    });
    const r2 = await fulfill(orderB, tx);
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe("provider_tx_duplicate");

    const { count } = await admin()
      .from("credit_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "plan_purchase");
    expect(count).toBe(1);
  });

  it("Concurrent credit safety: only allowed reservations succeed", async () => {
    const user = await createTestUser("conc");
    users.push(user.id);
    await admin().from("profiles").update({ credits: 50, credits_reserved: 0 }).eq("id", user.id);

    const { reserveCredits } = await import("@/lib/credits/ledger");
    const jobA = randomUUID();
    const jobB = randomUUID();

    const [a, b] = await Promise.all([
      reserveCredits(user.id, 30, jobA, `idem-${jobA}`),
      reserveCredits(user.id, 30, jobB, `idem-${jobB}`),
    ]);

    const successes = [a, b].filter((v) => v >= 0).length;
    expect(successes).toBe(1);

    const { data: profile } = await admin()
      .from("profiles")
      .select("credits, credits_reserved")
      .eq("id", user.id)
      .single();
    expect((profile?.credits as number) + (profile?.credits_reserved as number)).toBe(50);
  });

  it("Failure release: reservation released exactly once", async () => {
    const user = await createTestUser("release");
    users.push(user.id);
    await admin().from("profiles").update({ credits: 40, credits_reserved: 0 }).eq("id", user.id);

    const { reserveCredits, releaseCreditReserve } = await import("@/lib/credits/ledger");
    const jobId = randomUUID();
    const bal = await reserveCredits(user.id, 20, jobId, `rel-${jobId}`);
    expect(bal).toBeGreaterThanOrEqual(0);

    const r1 = await releaseCreditReserve(jobId, `release-${jobId}`);
    const r2 = await releaseCreditReserve(jobId, `release-${jobId}`);
    expect(r1).toBe(true);
    expect(r2).toBe(true);

    const { data: profile } = await admin()
      .from("profiles")
      .select("credits, credits_reserved")
      .eq("id", user.id)
      .single();
    expect(profile?.credits_reserved).toBe(0);
    expect(profile?.credits).toBe(40);
  });

  it("Workspace entitlement: API path rejects creation at limit", async () => {
    const password = randomUUID();
    const user = await createTestUser("ws-api");
    users.push(user.id);
    await admin().auth.admin.updateUserById(user.id, { password });

    await fulfill(
      await insertPendingOrder(user.id, user.email, {
        itemId: "standard",
        orderKind: "plan_purchase",
        credits: 100,
        amountCents: 900,
      })
    );

    const { resolveEntitlements } = await import("@/lib/commerce/entitlements");
    const ent = await resolveEntitlements(user.id);
    expect(ent.workspace_limit).toBe(1);
    expect(ent.current_workspace_count).toBe(1);
    expect(ent.can_create_workspace).toBe(false);

    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
      auth: { persistSession: false },
    });
    const { data: session } = await anon.auth.signInWithPassword({ email: user.email, password });
    expect(session.session?.access_token).toBeTruthy();

    const { POST } = await import("@/app/api/workspaces/route");
    const res = await POST(
      new Request("http://localhost/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session!.access_token}`,
        },
        body: JSON.stringify({ name: "Blocked via API" }),
      })
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("WORKSPACE_LIMIT");
  });

  it("Renewal notifications: dedupe in-app per membership/day", async () => {
    const user = await createTestUser("notify");
    users.push(user.id);

    await fulfill(
      await insertPendingOrder(user.id, user.email, {
        itemId: "standard",
        orderKind: "plan_purchase",
        credits: 100,
        amountCents: 900,
      })
    );

    const expires = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    await admin().from("memberships").update({ expires_at: expires }).eq("user_id", user.id);

    const { runPlanRenewalReminders } = await import("@/lib/commerce/notifications");
    const first = await runPlanRenewalReminders();
    const second = await runPlanRenewalReminders();
    expect(first.inApp).toBeGreaterThanOrEqual(1);
    expect(second.inApp).toBe(0);

    const { data: membership } = await admin()
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const dedupeKey = `plan_expiry:${membership!.id}:2:in_app`;
    const { count } = await admin()
      .from("user_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("dedupe_key", dedupeKey);
    expect(count).toBe(1);
  });
});
