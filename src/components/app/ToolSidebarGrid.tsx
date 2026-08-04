"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import {
  ACTIVE_MAIN_TOOLS,
  COMING_SOON_MAIN_TOOLS,
  getTool,
  type ToolDef,
} from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import { Lock } from "lucide-react";

const GRID_TOOLS = [...ACTIVE_MAIN_TOOLS, ...COMING_SOON_MAIN_TOOLS];
const PROMPTE_TOOL = getTool("prompte");

export function ToolSidebarGrid({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-3 pt-4">
        <div className="grid grid-cols-2 gap-2">
          {GRID_TOOLS.map((tool) => (
            <ToolGridCard
              key={tool.id}
              tool={tool}
              active={pathname === tool.route}
              onClick={() => go(tool.route)}
            />
          ))}
          {PROMPTE_TOOL && (
            <ToolGridCard
              tool={PROMPTE_TOOL}
              active={pathname === "/prompts"}
              onClick={() => go("/prompts")}
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <SidebarLink
            active={pathname === "/prompts"}
            icon="prompts"
            label="maro Prompts"
            onClick={() => go("/prompts")}
          />
          <SidebarLink
            active={pathname === "/krijimet"}
            icon="history"
            label="Çka ke maru"
            onClick={() => go("/krijimet")}
          />
        </div>
      </div>

      <Link
        href="/credits#fort"
        onClick={onNavigate}
        className="mx-3 mb-3 mt-2 flex items-center gap-2.5 rounded-2xl bg-sidebar-card px-3 py-3 transition-colors hover:bg-surface-2"
      >
        <MaroIcon name="maroFort" className="h-8 w-8" />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold text-ink">maroFort</span>
          <span className="block text-[11.5px] text-ink-3">Modaliteti ekspert</span>
        </span>
      </Link>
    </div>
  );
}

function ToolGridCard({
  tool,
  active,
  onClick,
}: {
  tool: ToolDef;
  active: boolean;
  onClick: () => void;
}) {
  const locked = !tool.functional;
  const Icon = tool.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[88px] flex-col items-start justify-between rounded-2xl p-3 text-left transition-colors",
        active ? "bg-accent-teal-soft ring-1 ring-accent-teal/40" : "bg-sidebar-card hover:bg-surface-2",
        locked && !active && "opacity-80"
      )}
    >
      <span className="flex w-full items-start justify-between gap-1">
        <ToolIcon toolId={tool.id} fallback={Icon} className="h-7 w-7" />
        {locked && (
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-surface/80">
            <MaroIcon name="lock" fallback={Lock} className="h-3.5 w-3.5 opacity-70" />
          </span>
        )}
      </span>
      <span className="mt-2 block text-[12.5px] font-bold leading-tight text-ink">{tool.name}</span>
    </button>
  );
}

function SidebarLink({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: "prompts" | "history";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition-colors",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      )}
    >
      <MaroIcon name={icon} className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );
}
