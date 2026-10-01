"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import { useMenuKeyboard } from "./useMenuKeyboard";

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
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();
  const nativeTrigger = React.isValidElement(trigger) && ["button", "a", Button].includes(trigger.type as typeof Button);
  const triggerContent = nativeTrigger && React.isValidElement<React.ButtonHTMLAttributes<HTMLButtonElement>>(trigger)
    ? React.cloneElement(trigger, { "aria-expanded": open, "aria-haspopup": "menu", "aria-controls": menuId })
    : trigger;
  useMenuKeyboard(open, panelRef, triggerRef, () => setOpen(false));

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        ref={triggerRef}
        role={nativeTrigger ? undefined : "button"}
        tabIndex={nativeTrigger ? undefined : 0}
        aria-expanded={nativeTrigger ? undefined : open}
        aria-haspopup={nativeTrigger ? undefined : "menu"}
        aria-controls={nativeTrigger ? undefined : menuId}
        onKeyDown={(event) => {
          if (["Enter", " ", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            setOpen(event.key === "ArrowDown" ? true : !open);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        {triggerContent}
      </div>
      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          className={cn(
            "maro-menu absolute z-[var(--maro-z-dropdown)] mt-2 min-w-[240px] max-w-[calc(100vw-2rem)] overflow-hidden animate-scale-in",
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
                type="button"
                role="menuitem"
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
