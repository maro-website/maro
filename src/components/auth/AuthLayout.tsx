"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LoginAdPanel } from "@/components/auth/LoginAdPanel";

function FacebookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971h-1.513c-1.49 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.741 2.982-4.31 2.982-7.35Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.6-4.123H3.06v2.591A9.998 9.998 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9A6.01 6.01 0 0 1 6.086 12c0-.659.114-1.3.314-1.9V7.509H3.06A9.998 9.998 0 0 0 2 12c0 1.614.386 3.141 1.06 4.491L6.4 13.9Z" />
      <path fill="#EA4335" d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.991 14.696 2 12 2a9.998 9.998 0 0 0-8.94 5.509L6.4 10.1c.79-2.364 2.995-4.123 5.6-4.123Z" />
    </svg>
  );
}

function SocialPlaceholders() {
  return (
    <div className="grid gap-2.5">
      <button type="button" disabled title="Së shpejti" className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-maro12 bg-surface px-4 text-[13px] font-semibold text-ink opacity-100"><FacebookIcon /> Hin me Facebook/Meta</button>
      <button type="button" disabled title="Së shpejti" className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-maro12 bg-surface px-4 text-[13px] font-semibold text-ink opacity-100"><GoogleIcon /> Hin me Google/Gmail</button>
    </div>
  );
}

const FOOTER_LINKS = [
  ["Përdorimi i drejtë", "/legal/fair-use"], ["Kushtet e Përdorimit", "/legal/terms"],
  ["Politika e Privatësisë", "/legal/privacy"], ["Politika e Rimbursimit", "/legal/refund"],
  ["Politika e Cookies", "/legal/cookies"], ["Çmimet & Kreditet", "/pricing"],
  ["Ndihmë & Mbështetje", "/contact"],
] as const;

export function AuthLayout({ children, title, subtitle, showSocials = false }: { children: React.ReactNode; title: string; subtitle: string; showSocials?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 items-center px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid w-full gap-5 lg:grid-cols-[420px_minmax(0,860px)] xl:grid-cols-[440px_minmax(0,860px)]">
          <section className="flex min-h-[627px] flex-col rounded-maro24 bg-surface-2 px-7 py-8 sm:px-11 sm:py-10">
            <h1 className="sr-only">{title}</h1><p className="sr-only">{subtitle}</p>
            <Link href="/" className="mx-auto inline-flex" aria-label="maro — Ballina"><Logo showWord wordClassName="h-[48px] sm:h-[54px]" /></Link>
            <div className="my-auto w-full py-10">
              {showSocials ? <><SocialPlaceholders /><div className="my-7 flex items-center gap-4" aria-hidden><span className="h-px flex-1 bg-line" /><span className="text-[11px] font-bold uppercase text-ink-2">ose</span><span className="h-px flex-1 bg-line" /></div></> : null}
              {children}
            </div>
          </section>
          <LoginAdPanel />
        </div>
      </main>
      <footer className="border-t border-line bg-surface px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-col items-center justify-between gap-3 text-center text-[11px] text-ink-3 lg:flex-row lg:text-left">
          <span>© 2026 - maro.al - Powered by NICE.al</span>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Linqet ligjore">{FOOTER_LINKS.map(([label, href]) => <Link key={href} href={href} className="transition-colors hover:text-ink">{label}</Link>)}</nav>
        </div>
      </footer>
    </div>
  );
}
