"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Dropdown } from "@/components/ui/Dropdown";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import { initials } from "@/lib/utils/format";
import { Coins, LogOut, Settings, Shield, User as UserIcon, Plus } from "lucide-react";

export function AppHeader() {
  const { user, isAdmin, credits, signOut } = useMaro();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <Badge tone="brand" className="hidden text-[10px] sm:inline-flex">
            Beta
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover sm:flex"
          >
            <Plus className="h-4 w-4" /> Maro
          </Link>
          <Link
            href="/credits"
            className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            <Coins className="h-4 w-4 text-brand" />
            {credits}
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
                {user?.avatarUrl ? (
                  <span className="h-8 w-8 overflow-hidden rounded-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: user?.avatarColor ?? "#5a28e5" }}
                  >
                    {initials(user?.name ?? "U")}
                  </span>
                )}
              </button>
            }
            items={[
              { label: "Llogaria", icon: <UserIcon />, onClick: () => router.push("/account") },
              ...(isAdmin
                ? [{ label: "Admin", icon: <Shield />, onClick: () => router.push("/admin") }]
                : []),
              { label: "Cilësimet", icon: <Settings />, onClick: () => router.push("/account") },
              { divider: true, label: "" },
              {
                label: "Dil",
                icon: <LogOut />,
                danger: true,
                onClick: async () => {
                  await signOut();
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
