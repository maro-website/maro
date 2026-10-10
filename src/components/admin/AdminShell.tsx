"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { ACCESS_ROLE_LABELS, type AccessRole } from "@/lib/admin/permissions";
import { AdminSidebar } from "./AdminSidebar";
import { AppTopNav } from "@/components/app/AppTopNav";
import { NavDrawer } from "@/components/app/NavDrawer";

export function AdminShell({
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
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (minimal) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="maro-system-header bg-canvas">
          <div className="mx-auto flex h-full max-w-[640px] items-center gap-[20px]">
            <span className="grid h-11 w-11 place-items-center rounded-maro12 bg-ink text-ink-inv">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[15px] font-bold tracking-[-0.03em] text-ink">Maro Control Center</div>
              <div className="text-xs text-ink-3">Verifikim MFA · {email}</div>
            </div>
          </div>
        </header>
        <main key={pathname} className="maro-page-shell max-w-[640px]">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-canvas">
      <AppTopNav onOpenDrawer={() => setDrawerOpen(true)} adminRoleLabel={ACCESS_ROLE_LABELS[role]} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:overflow-hidden lg:px-8 lg:py-8">
        <AdminSidebar role={role} />
        <main key={pathname} className="min-h-0 min-w-0 lg:overflow-y-auto lg:pr-2" aria-label="Maro Admin">
          {children}
        </main>
      </div>
    </div>
  );
}
