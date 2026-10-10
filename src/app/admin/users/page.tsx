"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserDirectory } from "@/components/admin/UserDirectory";

export default function AdminUsersPage() {
  return (
    <div>
      <AdminPageHeader
        title="Përdoruesit"
        description="Menaxho planet, kreditet, storage dhe llogaritë e përdoruesve."
      />
      <UserDirectory />
    </div>
  );
}
