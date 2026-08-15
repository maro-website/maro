"use client";

import Link from "next/link";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";

const FOOTER_LINKS = [
  { href: "/legal/fair-use", label: "Përdorimi i drejtë" },
  { href: "/legal/terms", label: "Kushtet e Përdorimit" },
  { href: "/legal/privacy", label: "Politika e Privatësisë" },
  { href: "/legal/refund", label: "Politika e Rimbursimit" },
  { href: "/legal/cookies", label: "Politika e Cookies" },
  { href: "/pricing", label: "Planet & Kreditet" },
  { href: "/contact", label: "Kontakt" },
] as const;

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={
        className ??
        "flex shrink-0 flex-col gap-3 border-t border-line/60 bg-footer px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="min-w-0">
        <p className="text-[12px] text-footer">
          © {new Date().getFullYear()} — {LEGAL_ENTITY.product} — Powered by NICE.al
        </p>
        <p className="mt-0.5 hidden text-[11px] leading-relaxed text-footer-muted lg:block">
          NRB {LEGAL_ENTITY.nrb} · {LEGAL_ADDRESS} · {LEGAL_ENTITY.phone}
        </p>
      </div>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[12px] font-medium text-footer-muted transition-colors hover:text-footer"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
