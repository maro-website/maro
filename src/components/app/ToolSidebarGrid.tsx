"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { MAIN_TOOLS, type ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import { Lock, Lightbulb } from "lucide-react";

type GridTool = ToolDef | { id: "plan"; name: string; functional: false; icon: typeof Lightbulb; route?: never };

const LOCKED_PLAN: GridTool = {
  id: "plan",
  name: "maro Plan",
  functional: false,
  icon: Lightbulb,
};

export function ToolSidebarGrid({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const gridTools: GridTool[] = [...MAIN_TOOLS, LOCKED_PLAN];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="grid grid-cols-2 gap-3">
          {gridTools.map((tool) => {
            const isLocked = tool.id === "plan" || !tool.functional;
            const active = !isLocked && "route" in tool && pathname === tool.route;
            return (
              <ToolGridCard
                key={tool.id}
                tool={tool}
                active={Boolean(active)}
                locked={isLocked}
                onClick={() => {
                  if (isLocked || !("route" in tool)) return;
                  go(tool.route);
                }}
              />
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => go("/prompts")}
            className={cn(
              "flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border-2 text-[16px] font-bold transition-colors",
              pathname === "/prompts"
                ? "border-accent-teal bg-accent-teal-soft text-accent-teal"
                : "border-accent-teal text-accent-teal hover:bg-accent-teal-soft"
            )}
          >
            <MaroIcon name="prompts" className="h-5 w-5" />
            maro Prompts
          </button>
          <button
            type="button"
            onClick={() => go("/krijimet")}
            className={cn(
              "flex h-[52px] w-full items-center gap-3 rounded-2xl bg-sidebar-card px-4 text-left text-[16px] font-semibold transition-colors hover:bg-surface-2",
              pathname === "/krijimet" ? "text-ink ring-1 ring-line" : "text-ink-2"
            )}
          >
            <MaroIcon name="history" className="h-5 w-5 shrink-0" />
            Çka ke maru
          </button>
        </div>
      </div>

      <Link
        href="/credits#fort"
        onClick={onNavigate}
        className="relative mt-4 flex min-h-[88px] items-end overflow-hidden rounded-2xl bg-sidebar-card p-4 transition-opacity hover:opacity-95"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, #3b17ff 0%, transparent 50%), radial-gradient(circle at 80% 70%, #00fdba 0%, transparent 45%), radial-gradient(circle at 50% 50%, #ff0000 0%, transparent 40%)",
          }}
        />
        <div className="relative flex w-full items-center justify-between gap-2">
          <div>
            <span className="block text-[17px] font-extrabold text-ink">maroFort</span>
            <span className="block text-[13px] text-ink-3">Modaliteti ekspert</span>
          </div>
          <MaroIcon name="maroFort" className="h-10 w-10 shrink-0" />
        </div>
      </Link>
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
  const available = !locked;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        "relative flex min-h-[120px] flex-col justify-between rounded-2xl p-4 text-left transition-colors",
        available
          ? "bg-teal-active text-ink ring-1 ring-accent-teal/30 hover:ring-accent-teal/50"
          : "cursor-default bg-sidebar-card text-ink-3",
        active && available && "ring-2 ring-accent-teal"
      )}
    >
      <span className="flex w-full items-start justify-between">
        {tool.id !== "plan" ? (
          <ToolIcon toolId={tool.id} fallback={Icon} className="h-8 w-8" />
        ) : (
          <MaroIcon name="prompts" fallback={Lightbulb} className="h-8 w-8 opacity-50" />
        )}
        {locked && (
          <MaroIcon name="lock" fallback={Lock} className="h-5 w-5 opacity-60" />
        )}
      </span>
      <span>
        <span className="block text-[15px] font-bold leading-tight">{tool.name}</span>
        {locked && (
          <span className="mt-0.5 block text-[12px] font-medium text-ink-3">së shpejti</span>
        )}
      </span>
    </button>
  );
}
