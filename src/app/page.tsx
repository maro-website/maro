"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const { user } = useMaro();
  const firstName = user?.name?.split(" ")[0];
  const [dayPart, setDayPart] = React.useState<"sot" | "sonte">("sot");

  React.useEffect(() => {
    const h = new Date().getHours();
    setDayPart(h >= 6 && h < 18 ? "sot" : "sonte");
  }, []);

  return (
    <AppShell>
      <div className="relative flex h-full min-w-0 flex-col items-center justify-center overflow-x-clip px-4 py-10 sm:px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-aurora" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="max-w-lg text-center"
        >
          <h1 className="text-balance text-[clamp(28px,5vw,42px)] font-light leading-[1.08] tracking-[-0.03em] text-ink">
            {firstName
              ? `Çka po marojmë ${dayPart}, ${firstName}?`
              : `Çka po marojmë ${dayPart}?`}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-3">
            Zgjidh një tool nga sidebar-i dhe shkruaj promptin poshtë. Canvas-i yt është gati.
          </p>
        </motion.div>
      </div>
    </AppShell>
  );
}
