"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EditTarget {
  sectionId: string;
  kind: "text" | "button" | "image";
  field: string;
  label: string;
  value: string;
}

export interface EditContext {
  editMode: boolean;
  selected: EditTarget | null;
  onSelect?: (t: EditTarget | null) => void;
}

export function Editable({
  target,
  ctx,
  as = "div",
  className,
  style,
  children,
}: {
  target: EditTarget;
  ctx: EditContext;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const isSelected =
    ctx.selected?.sectionId === target.sectionId &&
    ctx.selected?.field === target.field;

  if (!ctx.editMode) {
    return React.createElement(as, { className, style }, children);
  }

  return React.createElement(
    as,
    {
      className: cn("maro-editable", isSelected && "is-selected", className),
      style,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        ctx.onSelect?.(target);
      },
    },
    <>
      <span className="maro-tag">{target.label}</span>
      {children}
    </>
  );
}
