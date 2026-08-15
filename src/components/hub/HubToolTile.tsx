"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { cn } from "@/lib/utils/cn";
import { Lock, Megaphone, type LucideIcon } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function HubToolTile({
  label,
  toolId,
  icon,
  href,
  locked,
}: {
  label: string;
  toolId?: string;
  icon?: LucideIcon;
  href: string;
  locked?: boolean;
}) {
  const Icon = icon ?? Megaphone;

  const inner = (
    <motion.div
      whileHover={locked ? undefined : { scale: 1.04 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={cn(
        "flex h-[178px] w-[178px] flex-col items-center justify-center gap-4 rounded-maro16 border border-line bg-surface transition-shadow",
        locked ? "cursor-default opacity-70" : "hover:shadow-float motion-reduce:transform-none"
      )}
    >
      {locked ? (
        <Lock className="h-10 w-10 text-ink-3" />
      ) : toolId ? (
        <ToolIcon toolId={toolId} fallback={Icon} className="h-12 w-12 text-brand" />
      ) : (
        <MaroIcon name="prompts" fallback={Icon} className="h-12 w-12 text-brand" />
      )}
      <span className="text-[15px] font-semibold tracking-brand text-ink">{label}</span>
      {locked && <span className="text-[11px] font-medium text-ink-3">së shpejti</span>}
    </motion.div>
  );

  if (locked) return inner;
  return (
    <Link href={href} className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {inner}
    </Link>
  );
}
