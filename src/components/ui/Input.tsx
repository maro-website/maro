"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const fieldInputClass =
  "w-full min-h-[52px] rounded-maro16 bg-surface px-[20px] text-[16px] sm:text-[15px] text-ink placeholder:text-[var(--maro-gray-300)] outline-none transition-colors focus:bg-surface disabled:opacity-60";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldInputClass, "h-[52px]", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldInputClass, "resize-y px-[20px] py-[20px] leading-relaxed", className)}
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
      className={cn(fieldInputClass, "h-[52px] cursor-pointer appearance-none pr-10", className)}
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
    <label className={cn("maro-field", className)}>
      {label && (
        <span className="maro-field__label flex items-center gap-[10px]">
          {label}
          {optional && (
            <span className="text-[11px] font-medium text-ink-3">opsionale</span>
          )}
        </span>
      )}
      {children}
      {hint && <span className="maro-field__help block">{hint}</span>}
    </label>
  );
}
