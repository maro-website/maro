"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LegacyCreatorsTab } from "@/components/admin/legacy/LegacyAdminTabs";

export default function AdminCreatorsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Kreatorët"
        description="Aprovo aplikimet e kriatorëve dhe menaxho statusin e kriatorëve aktivë."
      />
      <LegacyCreatorsTab />
    </div>
  );
}
