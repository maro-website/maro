"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { ACCESS_ROLE_LABELS, type AccessRole } from "@/lib/admin/permissions";
import { AdminSidebar } from "./AdminSidebar";
import { Badge } from "@/components/ui/Badge";

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
              <div className="text-[11px] text-ink-3">Verifikim MFA</div>
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
    <div className="min-h-screen bg-canvas">
      <header className="maro-system-header sticky top-0 z-40 bg-canvas">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-[20px]">
          <div className="flex items-center gap-[20px]">
            <span className="grid h-11 w-11 place-items-center rounded-maro12 bg-ink text-ink-inv">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[15px] font-bold tracking-[-0.03em] text-ink">Maro Control Center</div>
              <div className="text-[11px] text-ink-3">{email}</div>
            </div>
          </div>
          <div className="flex items-center gap-[10px]">
            <Badge tone="brand" className="text-[10px]">
              {ACCESS_ROLE_LABELS[role]}
            </Badge>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-maro12 px-3 text-[12px] font-semibold text-ink-2 hover:bg-surface-2"
            >
              Kthehu te Maro
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-[30px] px-[20px] py-[30px] lg:grid-cols-[240px_1fr] lg:px-[30px]">
        <AdminSidebar role={role} />
        <main key={pathname} className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
