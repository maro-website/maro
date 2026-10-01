"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useDialogFocus } from "./useDialogFocus";

export function Modal({
  open,
  onClose,
  children,
  className,
  size = "md",
  closeOnBackdrop = true,
  hideClose = false,
  "aria-label": ariaLabel = "Dialogu",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  closeOnBackdrop?: boolean;
  hideClose?: boolean;
  "aria-label"?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  React.useEffect(() => setMounted(true), []);
  useDialogFocus(mounted && open, panelRef, onClose);

  React.useEffect(() => {
    if (!mounted || !open) return;
    const heading = panelRef.current?.querySelector("h1, h2, h3");
    if (heading) {
      if (!heading.id) heading.id = titleId;
      panelRef.current?.setAttribute("aria-labelledby", heading.id);
    }
  }, [mounted, open, titleId]);

  if (!mounted || !open) return null;

  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

  return createPortal(
    <div className="fixed inset-0 z-[var(--maro-z-dialog)] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-overlay animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          "maro-dialog relative max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-maro24 animate-scale-in sm:max-h-[calc(100dvh-2rem)] sm:rounded-maro20",
          sizes[size],
          className
        )}
      >
        {!hideClose && (
          <button
            onClick={onClose}
            className="absolute right-[20px] top-[20px] z-10 grid h-11 w-11 place-items-center rounded-maro12 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Mbyll"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ModalHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="maro-dialog-header">
      {icon && (
        <div className="mb-[20px] grid h-11 w-11 place-items-center rounded-maro12 bg-surface-2 text-ink">
          {icon}
        </div>
      )}
      <h2 className="maro-text-h3 text-ink">{title}</h2>
      {description && (
        <p className="maro-text-body mt-2 text-ink-2">{description}</p>
      )}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="maro-dialog-footer">
      {children}
    </div>
  );
}
