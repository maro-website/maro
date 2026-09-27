"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FortFieldSchema } from "@/lib/fort/types";

export function fortFieldPlaceholder(field: FortFieldSchema): string {
  const label = field.label?.trim();
  if (!label) return "Shkruje…";
  return `Shkruje ${label}`;
}

/** Hint for the info icon: description + example placeholder (not shown in the input). */
export function fieldInfoHint(field: FortFieldSchema): string | undefined {
  const parts: string[] = [];
  if (field.description?.trim()) parts.push(field.description.trim());
  const isText = field.type === "text" || field.type === "textarea";
  if (field.placeholder?.trim() && (isText || !field.description?.trim())) {
    parts.push(field.placeholder.trim());
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/** Small info icon; explanation shows on hover via native tooltip. */
export function FortInfoHint({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text.trim()) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 cursor-help items-center text-ink-3 transition-colors hover:text-ink-2",
        className
      )}
      title={text}
      aria-label={text}
      role="img"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
}
