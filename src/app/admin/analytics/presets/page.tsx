"use client";

import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PresetAnalyticsTab } from "@/components/admin/legacy/LegacyAdminTabs";

function PresetAnalyticsInner() {
  return (
    <div>
      <AdminPageHeader
        title="maroPresets — analitika"
        description="Shikime dhe kopjime të preset-eve nga prompt_events."
      />
      <PresetAnalyticsTab />
    </div>
  );
}

export default function AdminPresetAnalyticsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[13px] text-ink-3">Duke ngarkuar…</div>}>
      <PresetAnalyticsInner />
    </Suspense>
  );
}
