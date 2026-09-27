import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
  return <div className={s.launchFooter}>
    <Heading>{name}</Heading>
    {href && action ? <Link href={href} className={s.createButton}>{action}<ArrowUpRight size={19} aria-hidden /></Link> : <span className={s.release}>Vjen në {release?.toLowerCase()}</span>}
  </div>;
}
