"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ACCOUNT_TABS,
  parseAccountTab,
  type AccountTab,
} from "@/lib/payments/orderDisplay";
import { cn } from "@/lib/utils/cn";
import {
  Bell,
  Coins,
  Lock,
  Receipt,
  Trash2,
  User as UserIcon,
  Layers,
} from "lucide-react";

const TAB_ICONS: Record<AccountTab, React.ReactNode> = {
  profile: <UserIcon className="h-4 w-4" />,
  billing: <Coins className="h-4 w-4" />,
  preferences: <Bell className="h-4 w-4" />,
  security: <Lock className="h-4 w-4" />,
  orders: <Receipt className="h-4 w-4" />,
  danger: <Trash2 className="h-4 w-4" />,
};

export function AccountSidebar({
  active,
  onSelect,
}: {
  active: AccountTab;
  onSelect: (tab: AccountTab) => void;
}) {
  const pathname = usePathname();
  const workspacesActive = pathname.startsWith("/account/workspaces");

  return (
    <aside className="m-[30px] mr-0 hidden w-60 shrink-0 flex-col self-start rounded-maro20 bg-surface p-[30px] md:flex">
      <div className="pb-[20px] text-[13px] font-bold uppercase tracking-wider text-ink-3">
        Llogaria
      </div>
      {ACCOUNT_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            "flex min-h-11 items-center gap-[20px] rounded-maro12 px-[10px] text-left text-[13.5px] font-semibold transition-colors",
            active === tab.id ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
          )}
        >
          <span className={cn(active === tab.id ? "text-brand" : "text-ink-3")}>
            {TAB_ICONS[tab.id]}
          </span>
          <span className="min-w-0 flex-1 truncate">{tab.label}</span>
        </button>
      ))}
      <div className="my-[20px] border-t border-line" />
      <Link
        href="/account/workspaces"
        className={cn(
          "flex min-h-11 items-center gap-[20px] rounded-maro12 px-[10px] text-[13.5px] font-semibold transition-colors",
          workspacesActive ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
        )}
      >
        <span className={cn(workspacesActive ? "text-brand" : "text-ink-3")}>
          <Layers className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">Workspace-et</span>
      </Link>
    </aside>
  );
}

export function AccountTabSelect({
  active,
  onSelect,
}: {
  active: AccountTab;
  onSelect: (tab: AccountTab) => void;
}) {
  return (
    <select
      value={active}
      onChange={(e) => onSelect(parseAccountTab(e.target.value))}
      className="mb-[20px] min-h-[52px] w-full rounded-maro16 bg-surface px-[20px] text-[16px] font-medium text-ink outline-none md:hidden"
    >
      {ACCOUNT_TABS.map((tab) => (
        <option key={tab.id} value={tab.id}>
          {tab.label}
        </option>
      ))}
    </select>
  );
}

export function useAccountTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseAccountTab(searchParams.get("tab"));

  const setTab = React.useCallback(
    (tab: AccountTab) => {
      const q = tab === "profile" ? "" : `?tab=${tab}`;
      router.replace(`/account${q}`, { scroll: false });
    },
    [router]
  );

  return { active, setTab };
}
