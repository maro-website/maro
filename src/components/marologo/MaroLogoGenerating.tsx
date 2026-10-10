"use client";

import { GenerationLoader } from "@/components/app/GenerationLoader";

export function MaroLogoGenerating({ startedAt }: { startedAt?: number }) {
  return (
    <div className="marologo-shell pb-12">
      <div className="marologo-card mx-auto aspect-square w-full max-w-md overflow-hidden p-4">
        <GenerationLoader startedAt={startedAt} />
      </div>
    </div>
  );
}
