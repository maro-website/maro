"use client";

import Link from "next/link";
import { LEGAL_ENTITY } from "@/components/legal/legal-config";

const FOOTER_LINKS = [
  { href: "/legal/fair-use", label: "Përdorimi i drejtë" },
  { href: "/legal/terms", label: "Kushtet" },
  { href: "/legal/privacy", label: "Privatësia" },
  { href: "/legal/refund", label: "Rimbursimi" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/credits", label: "Çmimet" },
] as const;

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={
        className ??
        "shrink-0 border-t border-line bg-canvas/80 px-4 py-3 text-center backdrop-blur sm:px-5"
      }
    >
      <p className="text-[11.5px] text-ink-3">
        © {new Date().getFullYear()} {LEGAL_ENTITY.product}
      </p>
      <nav className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[11.5px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
