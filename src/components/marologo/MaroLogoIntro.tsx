"use client";

import { Button } from "@/components/ui/Button";
import { ToolIcon } from "@/components/app/OptionIcon";
import { ImagePlus } from "lucide-react";

export function MaroLogoIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="marologo-shell flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="mb-6 text-[13px] font-semibold text-brand">maroLogo · wizard</span>
      <div className="marologo-intro-icon mb-6">
        <ToolIcon toolId="logo" fallback={ImagePlus} className="h-14 w-14 text-brand" />
      </div>
      <h1 className="marologo-step-title mb-5">Logoja nis me ni ide.</h1>
      <p className="max-w-lg text-[16px] leading-relaxed text-ink-2">
        Pesë hapa të qartë. Na trego për brendin, drejtimin dhe ndjenjën — maro e kthen brief-in në identitet.
      </p>
      <Button
        type="button"
        className="mt-10 h-[52px] min-w-[220px] rounded-maro16 px-8 text-[15px] font-semibold"
        onClick={onStart}
      >
        Nise brief-in
      </Button>
      <p className="mt-5 text-[12px] text-ink-3">Emri · Drejtimi · Forma · Pamja · Finalizimi</p>
    </div>
  );
}
