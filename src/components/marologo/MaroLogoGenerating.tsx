"use client";

import { MaroBuildingLoader } from "@/components/app/MaroBuildingLoader";

export function MaroLogoGenerating() {
  return (
    <div className="marologo-shell flex min-h-[50vh] flex-col items-center justify-center text-center">
      <MaroBuildingLoader />
      <h2 className="mt-6 text-[20px] font-bold tracking-brand text-ink">Duke maru logon…</h2>
      <p className="mt-2 max-w-sm text-[14px] text-ink-2">
        maro po krijon konceptin e logos sipas brief-it tënd. Kjo mund të zgjasë disa sekonda.
      </p>
    </div>
  );
}
