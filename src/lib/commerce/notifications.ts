import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/engine";
import { getEmailSettings } from "@/lib/email/engine";

export async function upsertBillingNotification(opts: {
  userId: string;
  dedupeKey: string;
  title: string;
  body: string;
  actionHref?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("user_notifications")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("dedupe_key", opts.dedupeKey)
    .maybeSingle();
  if (existing) return false;

  const { error } = await admin.from("user_notifications").insert({
    user_id: opts.userId,
    dedupe_key: opts.dedupeKey,
    kind: "billing",
    title: opts.title,
    body: opts.body,
    action_href: opts.actionHref ?? "/account?tab=billing",
    metadata: opts.metadata ?? {},
  });
  return !error;
}

export async function runPlanRenewalReminders(): Promise<{ inApp: number; emails: number }> {
  const admin = getSupabaseAdmin();
  const emailSettings = await getEmailSettings();
  let inApp = 0;
  let emails = 0;

  const { data: rows } = await admin
    .from("memberships")
    .select("id, user_id, plan_id, expires_at, suspended, commerce_plans!inner(display_name, renewal_window_days)")
    .gt("expires_at", new Date().toISOString())
    .eq("suspended", false)
    .in("plan_id", ["standard", "pro", "business"]);

  if (!rows?.length) return { inApp, emails };

  const now = new Date();

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const expiresAt = new Date(String(r.expires_at));
    const renewalWindowDays = Number(
      (r.commerce_plans as { renewal_window_days?: number })?.renewal_window_days ?? 7
    );
    const msUntilExpiry = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000));

    if (daysRemaining < 1 || daysRemaining > renewalWindowDays) continue;

    const membershipId = String(r.id);
    const userId = String(r.user_id);
    const planName =
      (r.commerce_plans as { display_name?: string })?.display_name ?? String(r.plan_id);

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const expiresLabel = expiresAt.toLocaleDateString("sq-AL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const inAppKey = `plan_expiry:${membershipId}:${daysRemaining}:in_app`;
    const inserted = await upsertBillingNotification({
      userId,
      dedupeKey: inAppKey,
      title:
        daysRemaining === 1
          ? "Plani skadon nesër"
          : `Plani skadon për ${daysRemaining} ditë`,
      body: `${planName} — aktive deri më ${expiresLabel}. Rinovimi automatik: Jo.`,
      metadata: { membership_id: membershipId, days_remaining: daysRemaining },
    });
    if (inserted) inApp += 1;

    if ((daysRemaining === 2 || daysRemaining === 1) && emailSettings.productEmailEnabled) {
      const emailKey = `plan_expiry:${membershipId}:${daysRemaining}:email`;
      const { data: existingEmail } = await admin
        .from("user_notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("dedupe_key", emailKey)
        .maybeSingle();

      if (!existingEmail && profile?.email) {
        const templateKey =
          daysRemaining === 2 ? "plan_expiring_2_days" : "plan_expiring_1_day";
        const result = await sendEmail({
          to: profile.email as string,
          templateKey,
          locale: "sq",
          channel: "product",
          idempotencyKey: emailKey,
          variables: {
            plan_name: planName,
            expires_date: expiresLabel,
            billing_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://maro.al"}/account?tab=billing`,
            user_name: (profile.full_name as string) ?? (profile.email as string),
          },
        });
        if (result.ok) {
          await upsertBillingNotification({
            userId,
            dedupeKey: emailKey,
            title: "Email dërguar",
            body: templateKey,
            metadata: { email: true },
          });
          emails += 1;
        }
      }
    }

    const persistedStatus = daysRemaining <= renewalWindowDays ? "RENEWAL_WINDOW" : "ACTIVE";
    await admin
      .from("memberships")
      .update({ persisted_status: persistedStatus, updated_at: new Date().toISOString() })
      .eq("id", membershipId);
  }

  await admin
    .from("memberships")
    .update({ persisted_status: "EXPIRED", updated_at: new Date().toISOString() })
    .lte("expires_at", now.toISOString())
    .neq("persisted_status", "EXPIRED");

  return { inApp, emails };
}
