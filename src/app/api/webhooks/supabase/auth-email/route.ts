import { NextResponse } from "next/server";
import {
  isAuthEmailHookConfigured,
  mapAuthHookError,
  processAuthEmailHook,
  verifyAuthHookSignature,
} from "@/lib/email/authHook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase Send Email Hook (Phase 1A — dormant until configured in Dashboard Phase 1B).
 *
 * Rollback: disable this hook in Supabase to resume the configured Email Provider.
 * Do not disable the Email Provider itself. No automatic SMTP fallback on failure.
 */
export async function POST(req: Request) {
  if (!isAuthEmailHookConfigured()) {
    return NextResponse.json({ error: "hook_not_configured" }, { status: 503 });
  }

  const rawBody = await req.text();

  try {
    verifyAuthHookSignature(rawBody, req.headers);
  } catch (err) {
    const mapped = mapAuthHookError(err);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  try {
    const result = await processAuthEmailHook(rawBody);
    if (!result.ok) {
      return NextResponse.json({ error: result.message ?? "send_failed" }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapAuthHookError(err);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
