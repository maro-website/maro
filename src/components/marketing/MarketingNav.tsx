"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import { ArrowRight, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#product", label: "Produkti" },
  { href: "#how", label: "Si funksionon" },
  { href: "#examples", label: "Shembuj" },
  { href: "#pricing", label: "Çmimet" },
];

export function MarketingNav() {
  const { user } = useMaro();
  const router = useRouter();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled
          ? "border-b border-line bg-canvas/85 backdrop-blur-lg"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href={user ? "/dashboard" : "/sign-in"}>
            <Button variant="ghost" size="sm">
              {user ? "Dashboard" : "Sign in"}
            </Button>
          </Link>
          <Button
            size="sm"
            iconRight={<ArrowRight className="h-4 w-4" />}
            onClick={() => router.push(user ? "/new" : "/sign-up")}
          >
            Maro website
          </Button>
        </div>

        <button
          className="grid h-9 w-9 place-items-center rounded-lg text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-canvas px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink-2 hover:bg-surface-2"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Link href={user ? "/dashboard" : "/sign-in"}>
              <Button variant="outline" className="w-full">
                {user ? "Dashboard" : "Sign in"}
              </Button>
            </Link>
            <Button className="w-full" onClick={() => router.push(user ? "/new" : "/sign-up")}>
              Maro website
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
