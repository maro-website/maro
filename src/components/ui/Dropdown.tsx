"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

export function Dropdown({
  trigger,
  items,
  align = "right",
  className,
  header,
}: {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
  header?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "maro-menu absolute z-50 mt-[10px] min-w-[240px] overflow-hidden animate-scale-in",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          )}
        >
          {header && (
            <div className="mb-[20px] rounded-maro16 bg-surface-2 p-[20px]">{header}</div>
          )}
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-[20px] h-px bg-line" />
            ) : (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick?.();
                }}
                className={cn(
                  "maro-menu__item",
                  item.danger
                    ? "text-danger hover:bg-danger/10"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                )}
              >
                {item.icon && <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
