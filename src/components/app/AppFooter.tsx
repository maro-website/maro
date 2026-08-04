"use client";

import Link from "next/link";
import { LEGAL_ENTITY } from "@/components/legal/legal-config";

const FOOTER_LINKS = [
  { href: "/legal/fair-use", label: "Përdorimi i drejtë" },
  { href: "/legal/terms", label: "Kushtet e Përdorimit" },
  { href: "/legal/privacy", label: "Politika e Privatësisë" },
  { href: "/legal/refund", label: "Politika e Rimbursimit" },
  { href: "/legal/cookies", label: "Politika e Cookies" },
  { href: "/credits", label: "Çmimet & Kreditet" },
] as const;

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={
        className ??
        "flex shrink-0 flex-col gap-3 border-t border-line/60 bg-canvas px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <p className="text-[13px] text-ink-3">
        © {new Date().getFullYear()} — {LEGAL_ENTITY.product} — Powered by NICE.al
      </p>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
