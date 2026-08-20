"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const fieldInputClass =
  "w-full min-h-[var(--maro-control-height-lg)] rounded-maro12 bg-surface-2 px-4 text-[16px] sm:text-[14px] text-ink placeholder:text-ink-3 outline-none transition-colors hover:bg-surface-hover focus:bg-surface focus-visible:shadow-[var(--maro-focus-ring)] disabled:opacity-60";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldInputClass, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldInputClass, "py-3 resize-y leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(fieldInputClass, "h-11 appearance-none pr-9 cursor-pointer", className)}
      {...props}
    >
      {children}
    </select>
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  optional,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("maro-field block", className)}>
      {label && (
        <span className="maro-field__label mb-0 flex items-center gap-1.5">
          {label}
          {optional && (
            <span className="text-[11px] font-medium text-ink-3">opsionale</span>
          )}
        </span>
      )}
      {children}
      {hint && <span className="maro-field__help mt-1.5 block">{hint}</span>}
    </label>
  );
}
