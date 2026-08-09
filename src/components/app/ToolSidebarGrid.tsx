"use client";

import { useRouter, usePathname } from "next/navigation";
import { MaroIcon } from "@/components/app/OptionIcon";
import { ToolGridCard } from "@/components/app/ToolGridCard";
import { MAIN_TOOLS, type ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import { Lightbulb } from "lucide-react";

type GridTool =
  | ToolDef
  | { id: "plan"; name: string; functional: false; icon: typeof Lightbulb; route?: undefined };

const LOCKED_PLAN: GridTool = { id: "plan", name: "maro Plan", functional: false, icon: Lightbulb };

export function ToolSidebarGrid({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const gridTools: GridTool[] = [...MAIN_TOOLS, LOCKED_PLAN];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[26px] pb-[26px] pt-10">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="grid grid-cols-2 gap-[11px]">
          {gridTools.map((tool) => {
            const locked = tool.id === "plan" || tool.functional === false;
            const active = !locked && "route" in tool && pathname === tool.route;
            return (
              <ToolGridCard
                key={tool.id}
                tool={tool}
                active={Boolean(active)}
                locked={locked}
                onClick={() => {
                  if (locked || !("route" in tool) || !tool.route) return;
                  go(tool.route);
                }}
              />
            );
          })}
        </div>

        <div className="mt-[20px] flex flex-col gap-[9px]">
          <button
            type="button"
            onClick={() => go("/prompts")}
            className={cn(
              "flex h-[60px] w-full items-center justify-between rounded-[11px] border border-line bg-sidebar-nav px-5 text-[16px] font-bold tracking-[-0.03em] transition-colors hover:bg-surface-2 focus:outline-none",
              "text-sidebar-nav-prompts"
            )}
          >
            <span>maro Prompts</span>
            <MaroIcon name="prompts" className="icon-tone-menu h-6 w-6 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => go("/krijimet")}
            className={cn(
              "flex h-[60px] w-full items-center justify-between rounded-[11px] border border-line bg-sidebar-nav px-5 text-[16px] font-bold tracking-[-0.03em] transition-colors hover:bg-surface-2 focus:outline-none",
              "text-sidebar-nav-history"
            )}
          >
            <span>Cka ke maru</span>
            <MaroIcon name="history" className="icon-tone-history h-6 w-6 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
