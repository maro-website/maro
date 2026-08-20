"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
        <h1 className="text-[clamp(28px,5vw,40px)] font-light tracking-[-0.03em] text-ink">
          Kontakt
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Pyetje për planet, maroBiz, ose mbështetje teknike — na kontakto.
        </p>

        <div className="mt-10 space-y-4 rounded-2xl bg-surface p-6 sm:p-8">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Adresa</p>
              <p className="mt-1 text-[15px] text-ink">{LEGAL_ENTITY.name}</p>
              <p className="text-[14px] text-ink-2">NRB {LEGAL_ENTITY.nrb}</p>
              <p className="text-[14px] text-ink-2">{LEGAL_ADDRESS}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Telefon</p>
              <p className="mt-1 text-[15px] text-ink">{LEGAL_ENTITY.phone}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Email</p>
              <p className="mt-1 text-[15px]">
                <a href={`mailto:${LEGAL_ENTITY.supportEmail}`} className="font-semibold text-ink hover:underline">
                  {LEGAL_ENTITY.supportEmail}
                </a>
                <span className="text-ink-3"> · support</span>
              </p>
              <p className="mt-1 text-[15px]">
                <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="font-semibold text-ink hover:underline">
                  {LEGAL_ENTITY.contactEmail}
                </a>
                <span className="text-ink-3"> · legal</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-maro16 bg-surface-2 p-6">
          <h2 className="text-[17px] font-semibold text-ink">maroBiz</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Për plane të personalizuara, prompt engineering dhe marrëveshje biznesi, na shkruaj me
            emrin e kompanisë dhe nevojat tuaja.
          </p>
          <a
            href={`mailto:${LEGAL_ENTITY.supportEmail}?subject=maroBiz%20-%20Kontakt`}
            className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover"
          >
            Na kontakto për maroBiz
          </a>
        </div>

        <p className="mt-8 text-[13px] text-ink-3">
          Orari i mbështetjes: E Hënë – E Premte, 09:00–17:00 (CET). Platforma online 24/7.
        </p>
        <p className="mt-4">
          <Link href="/pricing" className="text-[14px] font-semibold text-brand hover:underline">
            ← Kthehu te planet
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
