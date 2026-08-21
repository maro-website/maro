"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  onClose,
  children,
  className,
  size = "md",
  closeOnBackdrop = true,
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  closeOnBackdrop?: boolean;
  hideClose?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-overlay animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "maro-dialog relative max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-maro24 bg-surface animate-scale-in sm:max-h-[calc(100dvh-2rem)] sm:rounded-maro20",
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
    <div className="px-[30px] pb-[20px] pt-[30px] pr-[74px]">
      {icon && (
        <div className="mb-[20px] grid h-11 w-11 place-items-center rounded-maro12 bg-surface-2 text-ink">
          {icon}
        </div>
      )}
      <h2 className="text-[18px] font-bold tracking-tight text-ink">{title}</h2>
      {description && (
        <p className="mt-[10px] text-[13.5px] leading-relaxed text-ink-2">{description}</p>
      )}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-[10px] px-[30px] pb-[30px] pt-[20px]">
      {children}
    </div>
  );
}
