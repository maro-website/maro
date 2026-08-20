"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function LegalConsentCheckbox({
  checked,
  onChange,
  id = "legal-consent",
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-[20px] text-[13px] leading-relaxed text-ink-2",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="maro-native-checkbox mt-0.5"
      />
      <span>
        Unë pranoj{" "}
        <Link
          href="/legal/terms"
          target="_blank"
          className="font-semibold text-ink underline-offset-2 hover:underline"
        >
          Kushtet e Përdorimit
        </Link>
        ,{" "}
        <Link
          href="/legal/privacy"
          target="_blank"
          className="font-semibold text-ink underline-offset-2 hover:underline"
        >
          Politikën e Privatësisë
        </Link>{" "}
        dhe{" "}
        <Link
          href="/legal/refund"
          target="_blank"
          className="font-semibold text-ink underline-offset-2 hover:underline"
        >
          Politikën e Rimbursimit
        </Link>
        .
      </span>
    </label>
  );
}

export const LEGAL_CONSENT_REQUIRED = "Duhet të pranosh kushtet ligjore për të vazhduar.";
