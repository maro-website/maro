"use client";

import * as React from "react";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { useMaro } from "@/context/store";
import { initials, timeAgo } from "@/lib/utils/format";
import type { CreditTransaction } from "@/lib/types";
import { Coins, Sparkles, Zap, Check, ArrowUpRight, Clock } from "lucide-react";

const PLANS = [
  { key: "free", name: "Free", price: "€0", features: ["1 website", "Subdomain maro.al", "Editor bazik"] },
  { key: "starter", name: "Starter", price: "€9", features: ["3 website", "Domain i personalizuar", "Heqja e badge"] },
  { key: "growth", name: "Growth", price: "€19", features: ["10 website", "AI i avancuar", "Analytics"], featured: true },
  { key: "business", name: "Business", price: "€49", features: ["Të pakufizuar", "Ekip & role", "Mbështetje 24/7"] },
];

function AccountInner() {
  const { user, projects } = useMaro();
  const [modal, setModal] = React.useState<null | "upgrade" | "credits">(null);

  const transactions: CreditTransaction[] = projects
    .flatMap((p) => p.credits)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink">Llogaria</h1>

        {/* Profile + credits */}
        <div className="mt-6 grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
            <span className="grid h-14 w-14 place-items-center rounded-full text-[18px] font-bold text-white" style={{ background: user?.avatarColor }}>
              {initials(user?.name ?? "U")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-bold text-ink">{user?.name}</div>
              <div className="truncate text-[13.5px] text-ink-2">{user?.email}</div>
            </div>
            <Badge tone="neutral" className="capitalize">Plani {user?.plan}</Badge>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-2"><Coins className="h-4 w-4 text-brand" /> Maro Credits</span>
              <Button size="sm" variant="outline" onClick={() => setModal("credits")}>Bli</Button>
            </div>
            <div className="mt-2 text-[36px] font-extrabold tracking-tight text-ink">{user?.credits ?? 0}</div>
            <div className="text-[12.5px] text-ink-3">kredite të disponueshme</div>
          </div>
        </div>

        {/* Plans */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold tracking-tight text-ink">Planet</h2>
            <Button icon={<Sparkles className="h-4 w-4" />} onClick={() => setModal("upgrade")}>Upgrade</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => {
              const current = user?.plan === p.key;
              return (
                <div key={p.key} className={`relative flex flex-col rounded-2xl border p-5 ${p.featured ? "border-brand" : "border-line"} bg-surface`}>
                  {current && <span className="absolute -top-3 left-5 rounded-full bg-ink px-2.5 py-1 text-[10.5px] font-bold text-white">Plani aktual</span>}
                  {p.featured && !current && <span className="absolute -top-3 left-5 rounded-full bg-brand px-2.5 py-1 text-[10.5px] font-bold text-white">Popullor</span>}
                  <div className="text-[14px] font-bold text-ink">{p.name}</div>
                  <div className="mt-1 text-[26px] font-extrabold tracking-tight text-ink">{p.price}<span className="text-[13px] font-medium text-ink-3">/muaj</span></div>
                  <ul className="mt-4 flex flex-1 flex-col gap-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[12.5px] text-ink-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> {f}</li>
                    ))}
                  </ul>
                  <Button variant={current ? "subtle" : p.featured ? "primary" : "outline"} className="mt-4 w-full" disabled={current} onClick={() => setModal("upgrade")}>
                    {current ? "Aktiv" : "Zgjidh"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage */}
        <div className="mt-10">
          <h2 className="mb-4 text-[18px] font-bold tracking-tight text-ink">Përdorimi i krediteve</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {transactions.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13.5px] text-ink-3">Ende s'ka përdorim.</div>
            ) : (
              transactions.map((t, i) => (
                <div key={t.id} className={`flex items-center justify-between px-5 py-3.5 ${i !== transactions.length - 1 ? "border-b border-line" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
                      {t.reason === "generation" ? <Zap className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-semibold text-ink">{t.label}</div>
                      <div className="flex items-center gap-1 text-[11.5px] text-ink-3"><Clock className="h-3 w-3" /> {timeAgo(t.createdAt)}</div>
                    </div>
                  </div>
                  <span className="text-[14px] font-bold text-ink">{t.amount} kredite</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Modal open={!!modal} onClose={() => setModal(null)} size="sm">
        <ModalHeader
          icon={<ArrowUpRight className="h-5 w-5" />}
          title={modal === "credits" ? "Bli kredite" : "Upgrade planin"}
          description="Pagesat dhe abonimet vijnë në Phase 3. Për momentin kjo është vetëm një pamje paraprake."
        />
        <div className="px-6 pb-2">
          <div className="rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-brand" />
            <div className="text-[15px] font-bold text-ink">Coming in Phase 3</div>
            <p className="mt-1 text-[13px] text-ink-2">Integrimi i pagesave do të shtohet në një fazë të mëvonshme.</p>
          </div>
        </div>
        <ModalFooter>
          <Button onClick={() => setModal(null)}>E kuptova</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGate>
      <AccountInner />
    </AuthGate>
  );
}
