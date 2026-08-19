import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getEmailOverviewStats } from "@/lib/email/cms";
import { getEmailSettings } from "@/lib/email/engine";
import { isAuthEmailHookConfigured, isResendConfigured } from "@/lib/config/serverEnv";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [settings, stats] = await Promise.all([getEmailSettings(), getEmailOverviewStats()]);
  const resendConfigured = isResendConfigured();
  const hookSecretConfigured = isAuthEmailHookConfigured();

  return NextResponse.json({
    provider: "Resend",
    providerConfiguration: resendConfigured ? "configured" : "missing",
    from: `${settings.fromName} <${settings.fromEmail}>`,
    replyTo: settings.replyTo,
    productEmailSending: settings.productEmailEnabled ? "enabled" : "disabled",
    auth: "Managed separately by Supabase Auth Hook",
    hookConfiguration: hookSecretConfigured ? "configured" : "missing",
    stats,
  });
}
