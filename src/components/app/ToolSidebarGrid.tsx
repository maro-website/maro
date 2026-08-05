"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
    <div className="flex min-h-0 flex-1 flex-col px-[20px] pb-[20px]">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="grid grid-cols-2 gap-[10px]">
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

        <div className="mt-[20px] flex flex-col gap-[10px]">
          <button
            type="button"
            onClick={() => go("/prompts")}
            className={cn(
              "flex h-[52px] w-full items-center justify-between rounded-2xl px-4 text-[15px] font-bold transition-colors focus:outline-none",
              pathname === "/prompts"
                ? "bg-sidebar-nav text-sidebar-nav-prompts"
                : "bg-sidebar-nav text-sidebar-nav-prompts hover:opacity-90"
            )}
          >
            <span>maro Prompts</span>
            <MaroIcon name="prompts" className="icon-tone-teal h-[25px] w-[25px] shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => go("/krijimet")}
            className={cn(
              "flex h-[52px] w-full items-center justify-between rounded-2xl px-4 text-[15px] font-semibold transition-colors focus:outline-none",
              pathname === "/krijimet"
                ? "bg-sidebar-nav text-sidebar-nav-history"
                : "bg-sidebar-nav text-sidebar-nav-history hover:opacity-90"
            )}
          >
            <span>Çka ke maru</span>
            <MaroIcon name="history" className="icon-tone-history h-[25px] w-[25px] shrink-0" />
          </button>
        </div>
      </div>

      <MaroFortBanner onNavigate={onNavigate} />
    </div>
  );
}

function MaroFortBanner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/credits#fort"
      onClick={onNavigate}
      className="relative mt-[20px] block aspect-[985/470] w-full overflow-hidden rounded-2xl"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 25%, #3b17ff 0%, transparent 45%), radial-gradient(circle at 85% 30%, #00fdba 0%, transparent 40%), radial-gradient(circle at 60% 85%, #ff0000 0%, transparent 45%), #0a0a0a",
        }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-3.5 pr-1.5">
          <span className="text-[15px] font-extrabold tracking-tight text-black">maroFort</span>
          <span className="relative h-6 w-11 rounded-full bg-[#ff0000]">
            <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
          </span>
          <span className="pr-1 text-[13px] font-bold text-black">Falas</span>
        </div>
      </div>
    </Link>
  );
}
