import { Suspense } from "react";
import LegacyAdminTabContent from "@/components/admin/legacy/LegacyAdminTabs";

export default function LegacyAdminPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[13px] text-ink-3">Duke ngarkuar…</div>}>
      <LegacyAdminTabContent />
    </Suspense>
  );
}
