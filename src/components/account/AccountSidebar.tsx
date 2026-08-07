"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ACCOUNT_TABS,
  parseAccountTab,
  type AccountTab,
} from "@/lib/payments/orderDisplay";
import { cn } from "@/lib/utils/cn";
import {
  Bell,
  Lock,
  Receipt,
  Trash2,
  User as UserIcon,
} from "lucide-react";

const TAB_ICONS: Record<AccountTab, React.ReactNode> = {
  profile: <UserIcon className="h-4 w-4" />,
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
  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-surface/40 px-3 py-5 md:flex">
      <div className="px-2 pb-3 text-[13px] font-bold uppercase tracking-wider text-ink-3">
        Llogaria
      </div>
      {ACCOUNT_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-semibold transition-colors",
            active === tab.id ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
          )}
        >
          <span className={cn(active === tab.id ? "text-brand" : "text-ink-3")}>
            {TAB_ICONS[tab.id]}
          </span>
          <span className="min-w-0 flex-1 truncate">{tab.label}</span>
        </button>
      ))}
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
      className="mb-4 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none md:hidden"
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
