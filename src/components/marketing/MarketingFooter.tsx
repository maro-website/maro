import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-ink-2">
              Trego çka të duhet. Maro e maron. Platforma me AI që e kthen idenë
              tënde në website të gatshëm.
            </p>
          </div>
          {[
            { title: "Produkti", links: ["Editori", "Shabllonet", "Çmimet", "Ndryshimet"] },
            { title: "Kompania", links: ["Rreth nesh", "Blog", "Karriera", "Kontakt"] },
            { title: "Legal", links: ["Privatësia", "Kushtet", "Cookies"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-[13px] font-bold text-ink">{col.title}</div>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <span className="cursor-pointer text-[13.5px] text-ink-2 transition-colors hover:text-ink">
                      {l}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-[13px] text-ink-3 sm:flex-row">
          <span>© {new Date().getFullYear()} Maro. maro.al</span>
          <span>Bërë me kujdes në Prishtinë · Phase 1 prototype</span>
        </div>
      </div>
    </footer>
  );
}
