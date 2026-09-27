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

const cardShell =
  "relative flex aspect-square w-full min-h-[128px] flex-col rounded-maro16 border border-line p-5 text-left tracking-brand transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-maro-border-focus";

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
  const filled = active && !locked;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        "group",
        cardShell,
        locked
          ? "cursor-default bg-card-locked text-card-locked-fg"
          : filled
          ? "bg-ink text-white"
          : "bg-surface text-ink hover:bg-ink hover:text-white"
      )}
    >
      {locked ? (
        <span className="flex flex-1 items-start justify-center pt-1">
          <MaroIcon name="lock" fallback={Lock} className="h-5 w-5" />
        </span>
      ) : (
        <span className="flex w-full items-start">
          {tool.id === "plan" ? (
            <Lightbulb
              className={cn(
                "h-7 w-7",
                filled ? "text-white" : "text-ink group-hover:text-white"
              )}
            />
          ) : (
            <ToolIcon
              toolId={tool.id}
              fallback={Icon}
              className={cn(
                "h-7 w-7",
                filled ? "text-white" : "text-ink group-hover:text-white"
              )}
            />
          )}
        </span>
      )}

      <span className="min-w-0 leading-[1.12]">
        <span className="block truncate text-[16px] font-normal">{first}</span>
        {restLabel && <span className="block truncate text-[16px] font-bold">{restLabel}</span>}
        {locked && (
          <span className="mt-0.5 block text-[10px] font-bold tracking-brand">se shpejti</span>
        )}
      </span>
    </button>
  );
}
