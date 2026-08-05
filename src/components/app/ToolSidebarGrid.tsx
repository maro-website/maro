"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { MAIN_TOOLS, type ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import { Lock, Lightbulb } from "lucide-react";

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
        {/* Tool grid — 2 columns, 10px gap */}
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

        {/* maro Prompts (teal) + Çka ke maru */}
        <div className="mt-[20px] flex flex-col gap-[10px]">
          <button
            type="button"
            onClick={() => go("/prompts")}
            className={cn(
              "flex h-[52px] w-full items-center gap-2.5 rounded-2xl px-4 text-left text-[15px] font-bold transition-colors",
              pathname === "/prompts"
                ? "bg-accent-teal-soft text-accent-teal"
                : "bg-card-idle text-accent-teal hover:bg-surface-2"
            )}
          >
            <MaroIcon name="prompts" className="h-[25px] w-[25px]" />
            maro Prompts
          </button>
          <button
            type="button"
            onClick={() => go("/krijimet")}
            className={cn(
              "flex h-[52px] w-full items-center gap-2.5 rounded-2xl px-4 text-left text-[15px] font-semibold transition-colors",
              pathname === "/krijimet" ? "bg-surface-2 text-ink" : "bg-card-idle text-ink-2 hover:bg-surface-2"
            )}
          >
            <MaroIcon name="history" className="h-[25px] w-[25px] shrink-0" />
            Çka ke maru
          </button>
        </div>
      </div>

      {/* maroFort banner — 985x470 upload + link */}
      <MaroFortBanner onNavigate={onNavigate} />
    </div>
  );
}

function ToolGridCard({
  tool,
  active,
  locked,
  onClick,
}: {
  tool: GridTool;
  active: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  const [first, ...rest] = tool.name.split(" ");
  const restLabel = rest.join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        "relative flex min-h-[104px] flex-col justify-between gap-3 rounded-2xl p-[18px] text-left transition-colors",
        active
          ? "bg-card-active ring-2 ring-accent-teal"
          : locked
          ? "cursor-default bg-card-idle"
          : "bg-card-active hover:ring-1 hover:ring-accent-teal/40"
      )}
      style={{ color: locked ? "var(--card-locked-fg)" : "var(--card-active-fg)" }}
    >
      <span className="flex w-full items-start justify-between">
        {tool.id === "plan" ? (
          <Lightbulb className="h-[25px] w-[25px] opacity-70" />
        ) : (
          <ToolIcon toolId={tool.id} fallback={Icon} className="h-[25px] w-[25px]" />
        )}
        {locked && <MaroIcon name="lock" fallback={Lock} className="h-[18px] w-[18px] opacity-70" />}
      </span>
      <span className="leading-tight">
        <span className="block text-[16px] font-normal opacity-80">{first}</span>
        {restLabel && <span className="block text-[16px] font-bold">{restLabel}</span>}
        {locked && <span className="mt-1 block text-[12px] font-medium opacity-70">së shpejti</span>}
      </span>
    </button>
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
