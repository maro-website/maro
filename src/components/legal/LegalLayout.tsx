import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ArrowLeft } from "lucide-react";
import { LEGAL_ADDRESS, LEGAL_ENTITY, LEGAL_PAGES, LEGAL_UPDATED } from "./legal-config";

export function LegalLayout({
  title,
  current,
  children,
}: {
  title: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-aurora" />

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-12 lg:flex-row lg:gap-14">
        <aside className="lg:w-[240px] lg:shrink-0">
          <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-8">
            <Link href="/" aria-label="maro">
              <Logo showWord />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
            >
              <ArrowLeft className="h-4 w-4" /> Kthehu
            </Link>
          </div>

          <nav className="mt-8 hidden lg:block">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Faqet ligjore
            </div>
            <div className="flex flex-col gap-1.5">
              {LEGAL_PAGES.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className={
                    "rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors " +
                    (p.label === current
                      ? "bg-brand text-brand-fg"
                      : "text-ink-2 hover:bg-surface hover:text-ink")
                  }
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-line pb-6">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              {LEGAL_ENTITY.name} · NUI {LEGAL_ENTITY.nui}
            </p>
            <p className="mt-1 text-[13px] text-ink-3">{LEGAL_ADDRESS}</p>
            <h1 className="mt-2 text-[clamp(28px,5vw,40px)] font-light tracking-[-0.03em] text-ink">
              {title}
            </h1>
            <p className="mt-2 text-[13.5px] text-ink-3">Përditësuar: {LEGAL_UPDATED}</p>
          </header>

          <article className="legal-prose mt-8">{children}</article>

          <nav className="mt-10 border-t border-line pt-6 lg:hidden">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Faqet ligjore
            </div>
            <div className="flex flex-col gap-1.5">
              {LEGAL_PAGES.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className={
                    "rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-colors " +
                    (p.label === current
                      ? "bg-brand text-brand-fg"
                      : "bg-surface text-ink-2 hover:bg-surface-2")
                  }
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </nav>

          <footer className="mt-12 text-[12px] leading-relaxed text-ink-3">
            <p>
              © {new Date().getFullYear()} {LEGAL_ENTITY.product} — një produkt i{" "}
              {LEGAL_ENTITY.name} (NUI {LEGAL_ENTITY.nui}).
            </p>
            <p className="mt-1">
              {LEGAL_ADDRESS}
            </p>
            <p className="mt-1">
              Pyetje ligjore:{" "}
              <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="font-semibold text-ink-2 hover:text-ink">
                {LEGAL_ENTITY.contactEmail}
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[14.5px] leading-[1.65] text-ink-2">{children}</div>
    </section>
  );
}
