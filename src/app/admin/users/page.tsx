"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LegacyUsersTab } from "@/components/admin/legacy/LegacyAdminTabs";

export default function AdminUsersPage() {
  return (
    <div>
      <AdminPageHeader
        title="Përdoruesit"
        description="Menaxho kreditet, planet maroFort dhe statusin e kriatorëve."
      />
      <LegacyUsersTab />
    </div>
  );
}
