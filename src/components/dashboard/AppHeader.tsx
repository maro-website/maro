"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Dropdown } from "@/components/ui/Dropdown";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import { initials } from "@/lib/utils/format";
import { Coins, LogOut, RotateCcw, Settings, User as UserIcon, LayoutGrid } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const NAV = [
  { href: "/dashboard", label: "Projektet", icon: LayoutGrid },
  { href: "/account", label: "Llogaria", icon: UserIcon },
];

export function AppHeader() {
  const { user, signOut, resetDemoData } = useMaro();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
                    active ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <span className="flex cursor-default items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-medium text-ink-3">
              Inspirim <Badge tone="neutral" className="text-[10px]">së shpejti</Badge>
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="hidden items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-2 sm:flex"
          >
            <Coins className="h-4 w-4 text-brand" />
            {user?.credits ?? 0}
            <span className="text-ink-3">kredite</span>
          </Link>

          <Dropdown
            align="right"
            header={
              <div>
                <div className="text-[13px] font-bold text-ink">{user?.name}</div>
                <div className="truncate text-[12px] text-ink-3">{user?.email}</div>
              </div>
            }
            trigger={
              <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-surface-2">
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white"
                  style={{ background: user?.avatarColor ?? "#5a28e5" }}
                >
                  {initials(user?.name ?? "U")}
                </span>
              </button>
            }
            items={[
              { label: "Llogaria", icon: <UserIcon />, onClick: () => router.push("/account") },
              { label: "Cilësimet", icon: <Settings />, onClick: () => router.push("/account") },
              { divider: true, label: "" },
              {
                label: "Reset Demo Data",
                icon: <RotateCcw />,
                onClick: () => {
                  resetDemoData();
                  toast("Të dhënat u rivendosën");
                  router.push("/");
                },
              },
              {
                label: "Dil",
                icon: <LogOut />,
                danger: true,
                onClick: () => {
                  signOut();
                  router.push("/");
                },
              },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
