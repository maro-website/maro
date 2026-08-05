"use client";

import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { cn } from "@/lib/utils/cn";
import { Lock, Lightbulb, type LucideIcon } from "lucide-react";

export type GridToolLike = {
  id: string;
  name: string;
  functional?: boolean;
  icon: LucideIcon;
};

export function ToolGridCard({
  tool,
  active,
  locked,
  onClick,
}: {
  tool: GridToolLike;
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
        "relative flex min-h-[120px] flex-col justify-between gap-3 rounded-2xl p-[20px] text-left transition-colors focus:outline-none",
        active
          ? "bg-card-active"
          : locked
          ? "cursor-default bg-card-idle"
          : "bg-card-active"
      )}
    >
      <span className="flex w-full items-start justify-between">
        {tool.id === "plan" ? (
          <Lightbulb className={cn("h-[28px] w-[28px]", locked ? "icon-tone-locked" : "icon-tone-active")} />
        ) : (
          <ToolIcon
            toolId={tool.id}
            fallback={Icon}
            className={cn("h-[28px] w-[28px]", locked ? "icon-tone-locked" : "icon-tone-active")}
          />
        )}
        {locked && (
          <MaroIcon name="lock" fallback={Lock} className="icon-tone-locked h-[20px] w-[20px]" />
        )}
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-[16px] font-normal",
            locked ? "text-[#818181]" : "text-card-active-fg opacity-80"
          )}
        >
          {first}
        </span>
        {restLabel && (
          <span
            className={cn(
              "block text-[16px] font-bold",
              locked ? "text-[#818181]" : "text-card-active-fg"
            )}
          >
            {restLabel}
          </span>
        )}
        {locked && <span className="mt-1 block text-[12px] font-medium text-[#818181]">së shpejti</span>}
      </span>
    </button>
  );
}
