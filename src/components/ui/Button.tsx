"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "brand" | "secondary" | "ghost" | "outline" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

/** Maps app variant names to maro-primitives data-variant values. */
const MARO_VARIANT: Record<Variant, string> = {
  primary: "inverse",
  brand: "brand",
  secondary: "secondary",
  outline: "secondary",
  ghost: "ghost",
  subtle: "ghost",
  danger: "danger",
};

const MARO_SIZE: Record<Exclude<Size, "icon">, string> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      icon,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isIcon = size === "icon";

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-variant={MARO_VARIANT[variant]}
        data-size={isIcon ? undefined : MARO_SIZE[size]}
        className={cn(
          isIcon ? "maro-icon-button" : "maro-button",
          isIcon && "min-h-[2.75rem] min-w-[2.75rem]",
          className
        )}
        {...props}
      >
        {!loading && icon && <span className="shrink-0">{icon}</span>}
        {!isIcon && children}
        {!loading && iconRight && !isIcon && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
