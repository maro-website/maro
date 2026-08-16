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
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-[640px] items-center gap-3 px-4 py-4 sm:px-6">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-ink-inv">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[15px] font-bold tracking-[-0.03em] text-ink">Maro Control Center</div>
              <div className="text-[11px] text-ink-3">Verifikim MFA</div>
            </div>
          </div>
        </header>
        <main key={pathname} className="mx-auto max-w-[640px] px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-ink-inv">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[15px] font-bold tracking-[-0.03em] text-ink">Maro Control Center</div>
              <div className="text-[11px] text-ink-3">{email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="brand" className="text-[10px]">
              {ACCESS_ROLE_LABELS[role]}
            </Badge>
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-surface-2"
            >
              Kthehu te Maro
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        <AdminSidebar role={role} />
        <main key={pathname} className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
