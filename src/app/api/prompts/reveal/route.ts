import { NextResponse } from "next/server";
import { PRESET_REVEAL_DISABLED, PRESET_REVEAL_DISABLED_MESSAGE } from "@/lib/presets/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Preset reveal/unlock retired — maroPresets no longer expose hidden instructions. */
export async function POST() {
  return NextResponse.json(
    {
      error: "preset_reveal_disabled",
      message: PRESET_REVEAL_DISABLED_MESSAGE,
      disabled: PRESET_REVEAL_DISABLED,
    },
    { status: 410 }
  );
}
