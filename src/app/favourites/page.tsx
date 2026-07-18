"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { ProjectCard, CreationCard } from "@/components/app/cards";
import { useMaro } from "@/context/store";
import { Star } from "lucide-react";

export default function FavouritesPage() {
  const router = useRouter();
  const { projects, creations } = useMaro();

  const favProjects = projects.filter((p) => p.favourite);
  const favCreations = creations.filter((c) => c.favourite);
  const empty = favProjects.length === 0 && favCreations.length === 0;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto scroll-thin">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Star className="h-5 w-5 fill-brand" />
              </span>
              <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[32px]">
                Të preferuarat
              </h1>
            </div>
            <p className="mt-2 text-[15px] text-ink-2">
              Këtu ruhen website-t dhe imazhet që ke shënuar si të preferuara.
            </p>
          </motion.div>

          {empty && (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface-2/50 px-6 py-16 text-center">
              <Star className="h-8 w-8 text-ink-3" />
              <p className="mt-3 max-w-sm text-[15px] text-ink-2">
                Ende s&apos;ke asgjë të preferuar. Shto nga menuja me tri pika te çdo
                website apo imazh.
              </p>
            </div>
          )}

          {favProjects.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-ink-3">
                Website-t
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {favProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onOpen={(proj) =>
                      router.push(
                        proj.status === "generating"
                          ? `/projects/${proj.id}/generating`
                          : `/projects/${proj.id}/editor`
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {favCreations.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-ink-3">
                Imazhet
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {favCreations.map((c) => (
                  <CreationCard key={c.id} creation={c} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
