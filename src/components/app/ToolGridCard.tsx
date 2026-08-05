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
        "relative flex h-[120px] flex-col justify-between rounded-2xl p-[20px] text-left transition-colors focus:outline-none",
        locked
          ? "cursor-default bg-card-idle"
          : active
          ? "bg-card-active"
          : "bg-card-idle bg-card-hover"
      )}
    >
      <span className="flex w-full items-start justify-between">
        {tool.id === "plan" ? (
          <Lightbulb
            className={cn(
              "h-[28px] w-[28px]",
              locked ? "icon-tone-locked" : active ? "icon-tone-active" : "icon-tone-idle"
            )}
          />
        ) : (
          <ToolIcon
            toolId={tool.id}
            fallback={Icon}
            className={cn(
              "h-[28px] w-[28px]",
              locked ? "icon-tone-locked" : active ? "icon-tone-active" : "icon-tone-idle"
            )}
          />
        )}
        {locked && (
          <MaroIcon name="lock" fallback={Lock} className="icon-tone-locked h-[20px] w-[20px]" />
        )}
      </span>
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            "block truncate text-[16px] font-normal",
            locked ? "text-card-locked-fg" : active ? "text-card-active-fg opacity-80" : "text-card-idle-fg opacity-80"
          )}
        >
          {first}
        </span>
        {restLabel && (
          <span
            className={cn(
              "block truncate text-[16px] font-bold",
              locked ? "text-card-locked-fg" : active ? "text-card-active-fg" : "text-card-idle-fg"
            )}
          >
            {restLabel}
          </span>
        )}
        <span className={cn("mt-1 block h-[14px] text-[12px] font-medium", locked ? "text-card-locked-fg" : "invisible")}>
          së shpejti
        </span>
      </span>
    </button>
  );
}
