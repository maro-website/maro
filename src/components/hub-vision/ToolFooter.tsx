import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { getProductBrand } from "@/lib/design/maro-system";
import s from "./HubVision.module.css";

/** One shared name/action band for available and upcoming tools. */
export function ToolFooter({ name, href, action, release, heading = "h2" }: {
  name: string;
  href?: string;
  action?: string;
  release?: string;
  heading?: "h2" | "h3";
}) {
  const Heading = heading;
  const brand = getProductBrand(name);
  return <div className={s.launchFooter}>
    <Heading className="min-w-0">{brand ? <ProductLogo product={brand.id} naturalWidth className="h-7 sm:h-8" /> : name}</Heading>
    {href && action ? <Link href={href} className={s.createButton} style={brand ? { backgroundColor: brand.color, color: "var(--maro-color-text-on-accent)" } : undefined}>{action}<ArrowUpRight size={19} aria-hidden /></Link> : <>{href ? <Link href={href} className={s.release} aria-label={`Shiko ${brand?.displayName ?? name}`}>Vjen në {release?.toLowerCase()}</Link> : <span className={s.release}>Vjen në {release?.toLowerCase()}</span>}</>}
  </div>;
}
