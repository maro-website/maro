"use client";

import { Button } from "@/components/ui/Button";
import { ToolIcon } from "@/components/app/OptionIcon";
import { ImagePlus } from "lucide-react";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { MARO_PRODUCTS } from "@/lib/design/maro-system";

export function MaroLogoIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="marologo-shell flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="mb-6 flex items-center gap-2 text-[13px] font-semibold text-ink-3"><ProductLogo product="maroLogo" className="h-8 w-[114px]" /> · wizard</span>
      <div className="marologo-intro-icon mb-6" style={{ backgroundColor: MARO_PRODUCTS.maroLogo.color, color: "var(--maro-color-text-on-accent)" }}>
        <ToolIcon toolId="logo" fallback={ImagePlus} className="h-14 w-14" />
      </div>
      <h1 className="marologo-step-title mb-5">Logoja nis me ni ide.</h1>
      <p className="max-w-lg text-[16px] leading-relaxed text-ink-2">
        Një brief i shkurtër. Na trego çka bën brendi dhe si duhet me u ndi — Maro i merr vendimet tjera kreative.
      </p>
      <Button
        type="button"
        className="mt-10 h-[52px] min-w-[220px] rounded-maro16 px-8 text-[15px] font-semibold"
        onClick={onStart}
      >
        Nise brief-in
      </Button>
      <p className="mt-5 text-[12px] text-ink-3">Brendi · Drejtimi · Prezantimi</p>
    </div>
  );
}
