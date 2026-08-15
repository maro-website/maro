"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MaroIcon } from "@/components/app/OptionIcon";
import { ToolGridCard } from "@/components/app/ToolGridCard";
import { NAV_DESTINATIONS, isNavActive } from "@/lib/nav/destinations";
import { ACTIVE_MAIN_TOOLS } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import { Compass, Megaphone } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const utilityDestinations = NAV_DESTINATIONS.filter((d) =>
  ["presets", "krijimet", "explore", "marketing"].includes(d.id)
);

/** Hub home — greeting, tool cards, quick links from nav registry. */
export function HomeHub({ firstName }: { firstName?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (href: string) => router.push(href);

  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-center bg-hub-page px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex w-full max-w-[520px] flex-col items-center"
      >
        <h1 className="w-full text-center text-[clamp(32px,6vw,48px)] font-normal leading-[1.12] tracking-brand text-ink">
          maro diçka{" "}
          {firstName ? <span className="font-bold">{firstName}</span> : null}
        </h1>

        <div className="mt-6 grid w-full grid-cols-3 gap-[11px]">
          {ACTIVE_MAIN_TOOLS.map((tool) => (
            <ToolGridCard
              key={tool.id}
              tool={tool}
              active={pathname === tool.route}
              locked={false}
              onClick={() => go(tool.route)}
            />
          ))}
        </div>

        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          {utilityDestinations.map((dest) => (
            <button
              key={dest.id}
              type="button"
              onClick={() => go(dest.route)}
              className={cn(
                "group flex h-[60px] items-center justify-between rounded-maro16 border border-line px-5 text-[16px] font-bold tracking-brand transition-colors focus:outline-none",
                isNavActive(pathname, dest)
                  ? "bg-ink text-white"
                  : "bg-surface text-ink hover:bg-ink hover:text-white"
              )}
            >
              <span>{dest.label}</span>
              {dest.id === "presets" && (
                <MaroIcon
                  name="prompts"
                  className="h-6 w-6 shrink-0 text-ink transition-colors group-hover:text-white"
                />
              )}
              {dest.id === "krijimet" && (
                <MaroIcon
                  name="history"
                  className="h-6 w-6 shrink-0 text-ink transition-colors group-hover:text-white"
                />
              )}
              {dest.id === "explore" && (
                <MaroIcon
                  name="prompts"
                  fallback={Compass}
                  className="h-6 w-6 shrink-0 text-ink transition-colors group-hover:text-white"
                />
              )}
              {dest.id === "marketing" && (
                <MaroIcon
                  name="coins"
                  fallback={Megaphone}
                  className="h-6 w-6 shrink-0 text-ink transition-colors group-hover:text-white"
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
