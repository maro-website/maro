"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AccessRolesPanel } from "@/components/admin/access/AccessRolesPanel";

export default function AdminAccessPage() {
  return (
    <div>
      <AdminPageHeader
        title="Rolet & Lejet"
        description="Menaxho rolet administrative RBAC. Kreatorët dhe planet komerciale mbeten të ndara nga qasja në Control Center."
      />
      <AccessRolesPanel />
    </div>
  );
}
