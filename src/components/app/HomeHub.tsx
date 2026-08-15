"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MaroIcon } from "@/components/app/OptionIcon";
import { ToolGridCard } from "@/components/app/ToolGridCard";
import { MAIN_TOOLS } from "@/lib/tools/registry";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Hub home — greeting, 3 tool cards, prompts + history row (Figma hub light/dark). */
export function HomeHub({ firstName }: { firstName?: string }) {
  const router = useRouter();
  const activeTools = MAIN_TOOLS.filter((t) => t.functional).slice(0, 3);

  const go = (href: string) => router.push(href);

  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-center bg-hub-page px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex w-full max-w-[382px] flex-col items-center"
      >
        <h1 className="w-full text-center text-[clamp(32px,6vw,48px)] font-normal leading-[1.12] tracking-[-0.03em] text-ink">
          maro diçka{" "}
          {firstName ? <span className="font-bold">{firstName}</span> : null}
        </h1>

        <div className="mt-5 grid w-full grid-cols-3 gap-[11px]">
          {activeTools.map((tool) => (
            <ToolGridCard
              key={tool.id}
              tool={tool}
              active={false}
              locked={false}
              onClick={() => go(tool.route)}
            />
          ))}
        </div>

        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => go("/prompts")}
            className="group flex h-[60px] items-center justify-between rounded-maro16 border border-line bg-surface px-5 text-[16px] font-bold tracking-brand text-ink transition-colors hover:bg-ink hover:text-white focus:outline-none"
          >
            <span>maro Ide</span>
            <MaroIcon
              name="prompts"
              className="h-6 w-6 shrink-0 text-ink transition-colors group-hover:text-white"
            />
          </button>
          <button
            type="button"
            onClick={() => go("/krijimet")}
            className="group flex h-[60px] items-center justify-between rounded-maro16 border border-line bg-surface px-5 text-[16px] font-bold tracking-brand text-ink transition-colors hover:bg-ink hover:text-white focus:outline-none"
          >
            <span>Cka ke maru</span>
            <MaroIcon
              name="history"
              className="h-6 w-6 shrink-0 text-ink transition-colors group-hover:text-white"
            />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
