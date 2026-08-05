"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { ToolGridCard } from "@/components/app/ToolGridCard";
import { useMaro } from "@/context/store";
import { MAIN_TOOLS } from "@/lib/tools/registry";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const router = useRouter();
  const { user } = useMaro();
  const firstName = user?.name?.split(" ")[0];
  const [dayPart, setDayPart] = React.useState<"sot" | "sonte">("sot");

  const activeTools = MAIN_TOOLS.filter((t) => t.functional).slice(0, 3);

  React.useEffect(() => {
    const h = new Date().getHours();
    setDayPart(h >= 6 && h < 18 ? "sot" : "sonte");
  }, []);

  return (
    <AppShell>
      <div className="flex h-full min-w-0 flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="w-full max-w-md"
        >
          <h1 className="text-balance text-center text-[clamp(32px,5vw,48px)] font-normal leading-[1.06] tracking-[-0.03em] text-ink">
            {firstName ? `Çka po marojmë ${dayPart}, ${firstName}?` : `Çka po marojmë ${dayPart}?`}
          </h1>

          <div className="mt-10 grid grid-cols-2 gap-[10px]">
            {activeTools.map((tool) => (
              <ToolGridCard
                key={tool.id}
                tool={tool}
                active={false}
                locked={false}
                onClick={() => router.push(tool.route)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
