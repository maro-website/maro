"use client";
import * as React from "react";
import Link from "next/link";
import { useMaro } from "@/context/store";
import { hasPermission } from "@/lib/admin/permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { adminRequest, Section } from "./shared";
type Configuration = { modules: Array<{ module: string; configured: boolean; models: Array<{ key: string; label: string; enabled: boolean; isDefault: boolean; customerCredits: number }> }> };
export function V1Overview() {
  const { accessRole } = useMaro();
  const canViewEngine = hasPermission(accessRole,"engine.view");
  const [data,setData] = React.useState<Configuration | null>(null); const [error,setError]=React.useState("");
  React.useEffect(() => { if (canViewEngine) adminRequest<Configuration>("/api/admin/v1/configuration").then(setData).catch(() => setError("Konfigurimi nuk u ngarkua.")); },[canViewEngine]);
  return <div className="space-y-8"><AdminPageHeader title="Maro Admin" description="Gjendja e platformës, aktiviteti dhe veprimet kryesore në një vend." /><AnalyticsPanel compact />
    {canViewEngine && <section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold text-ink">Mjetet aktive · V1</h2><Link href="/admin/engine/generations" className="maro-button" data-variant="secondary">Shiko gjenerimet</Link></div>{error && <p role="alert" className="mb-4 text-danger">{error}</p>}<div className="grid gap-4 lg:grid-cols-2">{data?.modules.map(module => <Section key={module.module} title={module.module === "maro_logo" ? "maroLogo" : "maroImazh"}><p className="text-sm text-ink-3">{module.configured ? "Konfigurimi i prodhimit është gati" : "Konfigurimi kërkon kontroll"}</p><div className="divide-y divide-line">{module.models.map(model => <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={model.key}><span className="font-semibold text-ink">{model.label}<span className="ml-2 font-normal text-ink-3">{model.isDefault ? "Parazgjedhje" : ""}</span></span><span className="text-ink-3">{model.enabled ? `${model.customerCredits} kredite` : "Joaktiv"}</span></div>)}</div><Link href={`/admin/engine/tools/${module.module}`} className="maro-button" data-variant="secondary">Menaxho mjetin</Link></Section>)}</div></section>}
  </div>;
}
