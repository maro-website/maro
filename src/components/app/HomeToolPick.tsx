"use client";

import { ToolIcon } from "@/components/app/OptionIcon";
import type { LucideIcon } from "lucide-react";

export type HomeToolLike = {
  id: string;
  name: string;
  icon: LucideIcon;
};

/** Hub home — icon + label, no card box (matches Figma hub). */
export function HomeToolPick({
  tool,
  onClick,
}: {
  tool: HomeToolLike;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  const [first, ...rest] = tool.name.split(" ");
  const restLabel = rest.join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-4 rounded-2xl p-3 text-left transition-opacity hover:opacity-80 focus:outline-none"
    >
      <ToolIcon
        toolId={tool.id}
        fallback={Icon}
        className="hub-tool-icon h-10 w-10 shrink-0"
      />
      <span className="min-w-0 leading-tight">
        <span className="block text-[15px] font-normal text-hub-tool-sub">{first}</span>
        {restLabel && (
          <span className="block text-[clamp(20px,4vw,26px)] font-bold text-hub-tool">{restLabel}</span>
        )}
      </span>
    </button>
  );
}
