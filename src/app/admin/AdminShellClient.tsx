"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import type { AccessRole } from "@/lib/admin/permissions";

export function AdminShellClient({
  role,
  email,
  children,
}: {
  role: AccessRole;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <AdminShell role={role} email={email}>
      {children}
    </AdminShell>
  );
}
