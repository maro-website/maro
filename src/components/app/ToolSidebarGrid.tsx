"use client";

import { useRouter, usePathname } from "next/navigation";
import { MaroIcon } from "@/components/app/OptionIcon";
import { ToolGridCard } from "@/components/app/ToolGridCard";
import { ACTIVE_MAIN_TOOLS, COMING_SOON_MAIN_TOOLS, type ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";

const LOCKED_PLAN = { id: "plan", name: "maro Plan" };

function SidebarLockedRow({ name }: { name: string }) {
  return (
    <div
      className="flex h-[52px] w-full items-center justify-between rounded-maro16 bg-card-locked px-5 tracking-brand"
      aria-disabled
    >
      <span className="text-[16px] font-bold text-card-locked-fg">{name}</span>
      <span className="text-[12px] font-semibold text-card-locked-fg">se shpejti</span>
    </div>
  );
}

export function ToolSidebarGrid({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const lockedTools: Array<ToolDef | typeof LOCKED_PLAN> = [...COMING_SOON_MAIN_TOOLS, LOCKED_PLAN];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[26px] pb-[26px] pt-10">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {/* Active product rail — 2-column square cards */}
        <div className="grid grid-cols-2 gap-[11px]">
          {ACTIVE_MAIN_TOOLS.map((tool) => {
            const active = pathname === tool.route;
            return (
              <ToolGridCard
                key={tool.id}
                tool={tool}
                active={active}
                locked={false}
                onClick={() => go(tool.route)}
              />
            );
          })}
        </div>

        {/* Coming soon — slim horizontal rows */}
        <div className="mt-[11px] flex flex-col gap-[9px]">
          {lockedTools.map((tool) => (
            <SidebarLockedRow key={tool.id} name={tool.name} />
          ))}
        </div>

        {/* Utility navigation */}
        <div className="mt-[20px] flex flex-col gap-[9px]">
          <button
            type="button"
            onClick={() => go("/prompts")}
            className={cn(
              "flex h-[60px] w-full items-center justify-between rounded-maro16 border border-line bg-sidebar-nav px-5 text-[16px] font-bold tracking-brand transition-colors hover:bg-surface-2 focus:outline-none",
              "text-sidebar-nav-prompts"
            )}
          >
            <span>maro Ide</span>
            <MaroIcon name="prompts" className="h-6 w-6 shrink-0 text-ink" />
          </button>
          <button
            type="button"
            onClick={() => go("/krijimet")}
            className={cn(
              "flex h-[60px] w-full items-center justify-between rounded-maro16 border border-line bg-sidebar-nav px-5 text-[16px] font-bold tracking-brand transition-colors hover:bg-surface-2 focus:outline-none",
              "text-sidebar-nav-history"
            )}
          >
            <span>Cka ke maru</span>
            <MaroIcon name="history" className="h-6 w-6 shrink-0 text-ink" />
          </button>
        </div>
      </div>
    </div>
  );
}
