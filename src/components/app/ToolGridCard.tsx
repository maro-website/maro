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
        "relative flex aspect-square w-full flex-col rounded-[11px] p-5 text-left tracking-[-0.03em] transition-colors focus:outline-none",
        locked
          ? "cursor-default bg-card-locked"
          : active
          ? "bg-card-active ring-card-active"
          : "border border-line bg-card-idle bg-card-hover"
      )}
    >
      {locked ? (
        <span className="flex flex-1 items-start justify-center pt-1">
          <MaroIcon name="lock" fallback={Lock} className="icon-tone-locked h-5 w-5" />
        </span>
      ) : (
        <span className="flex w-full items-start">
          {tool.id === "plan" ? (
            <Lightbulb className={cn("h-7 w-7", active ? "icon-tone-active" : "icon-tone-idle")} />
          ) : (
            <ToolIcon
              toolId={tool.id}
              fallback={Icon}
              className={cn("h-7 w-7", active ? "icon-tone-active" : "icon-tone-idle")}
            />
          )}
        </span>
      )}

      <span className="min-w-0 leading-[1.12]">
        <span
          className={cn(
            "block truncate text-[16px] font-normal",
            locked ? "text-card-locked-fg" : active ? "text-card-active-fg" : "text-card-idle-fg"
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
        <span
          className={cn(
            "mt-0.5 block text-[10px] font-bold tracking-[-0.03em]",
            locked ? "text-card-locked-fg" : "invisible"
          )}
        >
          se shpejti
        </span>
      </span>
    </button>
  );
}
