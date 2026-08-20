"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "maro.cookies.accepted";

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const reject = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Njoftim cookies"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-5",
        "transition-all duration-300"
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-maro16 bg-surface p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-2">
          Përdorim cookies dhe ruajtje lokale për funksionimin e maro, sigurinë dhe preferencat e
          tua. Duke vazhduar, pranon{" "}
          <Link
            href="/legal/cookies"
            className="font-semibold text-ink underline-offset-2 hover:underline"
          >
            Politikën e Cookies
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/legal/cookies"
            className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Mëso më shumë
          </Link>
          <button
            type="button"
            onClick={reject}
            className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Refuzoj
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-xl bg-brand px-5 py-2.5 text-[13px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
          >
            Pranoj
          </button>
        </div>
      </div>
    </div>
  );
}
