"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const fieldInputClass =
  "maro-input transition-colors duration-fast";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldInputClass, "h-[var(--maro-control-height-lg)]", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldInputClass, "min-h-32 resize-y leading-relaxed", className)}
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
      className={cn(fieldInputClass, "h-[var(--maro-control-height-lg)] cursor-pointer appearance-none pr-10", className)}
      {...props}
    >
      {children}
    </select>
    <svg
      aria-hidden="true"
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
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const descriptionId = React.useId();
  const isControl = React.isValidElement<React.InputHTMLAttributes<HTMLInputElement>>(children) &&
    [Input, Textarea, Select, "input", "textarea", "select"].includes(children.type as typeof Input);
  const controlId = isControl && React.isValidElement<React.InputHTMLAttributes<HTMLInputElement>>(children)
    ? children.props.id ?? `${descriptionId}-control` : undefined;
  const control = isControl && React.isValidElement<React.InputHTMLAttributes<HTMLInputElement>>(children)
    ? React.cloneElement(children, {
        id: controlId,
        "aria-labelledby": children.props["aria-labelledby"] ?? (label && !children.props["aria-label"] ? `${descriptionId}-label` : undefined),
        "aria-describedby": [children.props["aria-describedby"], (error || hint) && descriptionId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;
  return (
    <label htmlFor={controlId} className={cn("maro-field", className)}>
      {label && (
        <span id={`${descriptionId}-label`} className="maro-field__label flex items-center gap-2">
          {label}
          {optional && (
            <span className="text-[11px] font-medium text-ink-3">opsionale</span>
          )}
        </span>
      )}
      {control}
      {(error || hint) && <span id={descriptionId} className={error ? "maro-field__error block" : "maro-field__help block"}>{error || hint}</span>}
    </label>
  );
}
