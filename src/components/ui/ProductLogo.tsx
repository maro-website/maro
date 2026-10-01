import { getProductBrand } from "@/lib/design/maro-system";
import { cn } from "@/lib/utils/cn";
import s from "./ProductLogo.module.css";

/** Official horizontal artwork. Compact locations use ToolIcon's standalone symbols. */
export function ProductLogo({ product, surface = "auto", className }: {
  product: string;
  surface?: "auto" | "light" | "dark";
  className?: string;
}) {
  const brand = getProductBrand(product);
  if (!brand) return null;
  return (
    <span className={cn(s.logo, className)} data-surface={surface} role="img" aria-label={brand.displayName}>
      {/* Asset suffix describes text color, not the background theme. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.horizontal.dark} alt="" aria-hidden className={cn(s.artwork, s.onLight)} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.horizontal.light} alt="" aria-hidden className={cn(s.artwork, s.onDark)} draggable={false} />
    </span>
  );
}
