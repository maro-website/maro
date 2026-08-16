import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminAccessPage() {
  return (
    <div>
      <AdminPageHeader
        title="Roles & Permissions"
        description="Menaxho rolet administrative të ekipit. Creator dhe plani komercial mbeten të ndara."
      />
      <AdminEmptyState
        title="UI e plotë vjen në fazën e ardhshme"
        description="API për ndryshimin e roleve është aktiv në /api/admin/users/role. Përdoruesit ekzistues me is_admin janë migruar në Super Admin."
      />
    </div>
  );
}
