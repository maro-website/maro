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
        "relative flex aspect-square w-full min-h-[128px] flex-col rounded-maro16 p-5 text-left tracking-brand transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-maro-border-focus",
        locked
          ? "cursor-default bg-card-locked"
          : active
          ? "bg-card-active"
          : "border border-line bg-card-idle bg-card-hover"
      )}
    >
      {locked ? (
        <span className="flex flex-1 items-start justify-center pt-1">
          <MaroIcon name="lock" fallback={Lock} className="h-5 w-5 text-card-locked-fg" />
        </span>
      ) : (
        <span className="flex w-full items-start">
          {tool.id === "plan" ? (
            <Lightbulb className={cn("h-7 w-7", active ? "text-card-active-fg" : "text-card-idle-fg")} />
          ) : (
            <ToolIcon
              toolId={tool.id}
              fallback={Icon}
              className={cn("h-7 w-7", active ? "text-card-active-fg" : "text-card-idle-fg")}
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
