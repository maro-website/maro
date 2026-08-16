"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import type { AccessRole } from "@/lib/admin/permissions";

export function AdminShellClient({
  role,
  email,
  children,
  minimal = false,
}: {
  role: AccessRole;
  email: string;
  children: React.ReactNode;
  minimal?: boolean;
}) {
  return (
    <AdminShell role={role} email={email} minimal={minimal}>
      {children}
    </AdminShell>
  );
}
