"use client";
import * as React from "react";
import Link from "next/link";
import { adminRequest, Section } from "./shared";
import { V1Operations } from "./V1Operations";
type Configuration = { modules: Array<{ module: string; configured: boolean; models: Array<{ key: string; label: string; enabled: boolean; isDefault: boolean; customerCredits: number }>; system: { version: string } | null; layers: number }> };
export function V1Overview() {
  const [data, setData] = React.useState<Configuration | null>(null); const [error, setError] = React.useState("");
  React.useEffect(() => { adminRequest<Configuration>("/api/admin/v1/configuration").then(setData).catch((e) => setError(e.message)); }, []);
  return <div className="space-y-6 p-6 text-ink"><h1 className="text-2xl font-bold">V1 Overview</h1><p role="status">{error}</p><div className="grid gap-4 lg:grid-cols-2">{data?.modules.map((m) => <Section key={m.module} title={m.module === "maro_logo" ? "maroLogo" : "maroImazh"}>
    <p>{m.configured ? "Production configuration available" : "Configuration needs attention"}</p><p className="text-sm">Published prompt: {m.system?.version ?? "unavailable"} · {m.layers} production instructions</p>
    {m.models.map((model) => <p key={model.key} className="text-sm">{model.label}: {model.enabled ? "enabled" : "disabled"}{model.isDefault ? " · default" : ""} · {model.customerCredits} credits</p>)}
    <Link className="text-sm font-semibold underline" href={`/admin/engine/tools/${m.module}`}>Manage configuration</Link>
  </Section>)}</div><p className="text-sm text-ink-3">Configuration readiness does not verify provider uptime. Future modules remain parked under the V1 release policy.</p><V1Operations compact /></div>;
}
