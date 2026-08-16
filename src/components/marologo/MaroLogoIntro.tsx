"use client";

import { Button } from "@/components/ui/Button";
import { ImagePlus } from "lucide-react";

export function MaroLogoIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="marologo-shell flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="marologo-intro-icon mb-6">
        <ImagePlus className="h-8 w-8 text-brand-fg" strokeWidth={1.75} />
      </div>
      <h1 className="marologo-step-title mb-4">maro logon tane&apos;</h1>
      <p className="max-w-md text-[15px] leading-relaxed text-ink-2">
        Na trego pak për brendin. maro i kthen përgjigjet tua në një logo profesionale.
      </p>
      <Button
        type="button"
        className="mt-10 h-12 min-w-[200px] rounded-2xl px-8 text-[15px] font-semibold"
        onClick={onStart}
      >
        maroje ni logo
      </Button>
    </div>
  );
}
