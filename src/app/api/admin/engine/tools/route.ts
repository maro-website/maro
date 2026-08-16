import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { ensureEngineSeeded } from "@/lib/engine/seed";
import { listEngineToolsWithMeta } from "@/lib/engine/storage";
import { isFeatureEnabled, FEATURE_PROMPT_COMPILER_V2 } from "@/lib/features/flags";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await ensureEngineSeeded(auth.admin.userId);
  const tools = await listEngineToolsWithMeta();
  const promptCompilerV2 = await isFeatureEnabled(FEATURE_PROMPT_COMPILER_V2);

  return NextResponse.json({ tools, promptCompilerV2 });
}
