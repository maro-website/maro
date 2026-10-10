"use client";
import * as React from "react";
import Link from "next/link";
import { Activity, Coins, CreditCard, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Misc";
import { adminRequest } from "./v1/shared";
import type { AnalyticsSnapshot } from "@/lib/analytics/types";

const number = (value: number) => value.toLocaleString("sq-AL");
const money = (value: number, currency = "EUR") => new Intl.NumberFormat("sq-AL", { style: "currency", currency }).format(value);

export function AnalyticsPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = React.useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [series, setSeries] = React.useState<"signups" | "completed">("completed");
  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await adminRequest<AnalyticsSnapshot>("/api/admin/analytics/overview?section=all")); }
    catch { setError("Analitikat nuk u ngarkuan. Provo rifreskimin."); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  return <div className="space-y-6" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3">{data ? `Përditësuar ${new Date(data.updatedAt).toLocaleString("sq-AL", { timeZone: data.timezone })} · koha e Tiranës` : "Të dhënat ngarkohen kur hapet kjo faqe."}</p><Button variant="secondary" loading={loading} icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>Rifresko</Button></div>
    {error && <p role="alert" className="rounded-maro16 border border-danger bg-maro-danger p-4 text-danger">{error}</p>}
    {!data && loading && <div className="flex min-h-48 items-center justify-center"><Spinner /></div>}
    {data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Arkëtimet reale · EUR" value={money(data.overview.revenueEur)} detail={`${number(data.overview.ordersPaid)} pagesa reale · bruto`} icon={CreditCard} href="/admin/commerce/payments" />
        <Metric title="Përdoruesit" value={number(data.overview.usersTotal)} detail={`${number(data.overview.usersCreators)} kreatorë`} icon={Users} href="/admin/users" />
        <Metric title="Gjenerime të përfunduara" value={number(data.overview.generationsLast7d)} detail="7 ditët e fundit · maroImazh + maroLogo" icon={Activity} href="/admin/engine/generations" />
        <Metric title="Kredite të përdorura" value={number(data.overview.creditsSpentLast7d)} detail="7 ditët e fundit · gjenerime të përfunduara" icon={Coins} href="/admin/commerce/ledger" />
      </div>
      <div className="rounded-maro20 border border-line bg-surface p-5 text-sm text-ink-2"><p><strong>{number(data.overview.excludedPaidOrders)} porosi testuese ose të paverifikuara përjashtohen.</strong> Arkëtimet janë bruto, para tarifave dhe rimbursimeve; nuk janë fitim.</p>{data.overview.receiptsByCurrency.filter(row => row.currency !== "EUR").map(row => <p className="mt-2" key={row.currency}>{row.currency}: {money(row.amount, row.currency)} · {number(row.orders)} pagesa. Monedhat nuk konvertohen ose mblidhen bashkë.</p>)}</div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-maro20 border border-line bg-surface p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">Aktiviteti · 30 ditë</h2><p className="mt-1 text-sm text-ink-3">{series === "signups" ? "Regjistrime të reja" : "Gjenerime të përfunduara"}</p></div><div className="flex gap-2"><Button variant={series === "completed" ? "primary" : "secondary"} aria-pressed={series === "completed"} onClick={() => setSeries("completed")}>Gjenerime</Button><Button variant={series === "signups" ? "primary" : "secondary"} aria-pressed={series === "signups"} onClick={() => setSeries("signups")}>Regjistrime</Button></div></div><BarChart label={series === "signups" ? "Regjistrimet ditore" : "Gjenerimet ditore të përfunduara"} rows={data.daily.map(row => ({ label: row.day, value: row[series] }))} /><p className="mt-3 text-xs text-ink-3">Gjenerime sipas datës së kërkesës. Kërkesat ende aktive nuk numërohen si sukses.</p></section>
        <section className="min-w-0 rounded-maro20 border border-line bg-surface p-5 sm:p-6"><h2 className="text-xl font-bold text-ink">Arkëtimet mujore · EUR</h2><p className="mb-5 mt-1 text-sm text-ink-3">6 muaj · sipas datës së pagesës së konfirmuar</p><BarChart label="Arkëtimet mujore bruto në EUR" moneyValues rows={receiptMonths(data)} /><p className="mt-3 text-xs text-ink-3">Vetëm pagesat reale në EUR. Muajt pa pagesa shfaqen me zero.</p></section>
      </div>
      {!compact && <section className="overflow-hidden rounded-maro20 border border-line bg-surface"><div className="p-6"><h2 className="text-xl font-bold text-ink">Përdorimi i mjeteve · 30 ditë</h2><p className="mt-1 text-sm text-ink-3">Kërkesat, rezultatet e përfunduara dhe kreditet e faturuara.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface-2 text-ink-3"><tr>{["Mjeti", "Kërkesa", "Përfunduar", "Kredite"].map(title => <th className="px-6 py-3 font-semibold" key={title}>{title}</th>)}</tr></thead><tbody className="divide-y divide-line">{data.byTool.map(row => <tr key={row.tool}><td className="px-6 py-4 font-semibold text-ink">{row.tool}</td><td className="px-6 py-4 tabular-nums">{number(row.attempts)}</td><td className="px-6 py-4 tabular-nums">{number(row.count)}</td><td className="px-6 py-4 tabular-nums">{number(row.credits)}</td></tr>)}</tbody></table>{!data.byTool.length && <p className="p-6 text-sm text-ink-3">Nuk ka gjenerime në këtë periudhë.</p>}</div></section>}
      <div className="grid gap-4 sm:grid-cols-3"><Metric title="Kërkesa sot" value={number(data.today.generations)} detail={`${number(data.today.activeUsers)} përdorues aktivë`} icon={Activity} /><Metric title="Kostot e vlerësuara AI sot" value={data.today.costMissing ? "—" : money(data.today.aiCostUsd, "USD")} detail={data.today.costMissing ? `${data.today.costMissing} gjenerime pa të dhëna kostoje` : "USD · gjenerime të përfunduara"} icon={Coins} /><Metric title="Për t’u kontrolluar" value={number(data.today.attention)} detail="Raporte të hapura + gjenerime të dështuara sot" icon={Activity} href="/admin/engine/generations" /></div>
    </>}
  </div>;
}

function Metric({ title, value, detail, icon: Icon, href }: { title: string; value: string; detail: string; icon: React.ElementType; href?: string }) {
  const content = <><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-ink-3">{title}</p><Icon className="h-5 w-5 shrink-0 text-ink-3" /></div><p className="my-3 text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p><p className="text-xs leading-relaxed text-ink-3">{detail}</p></>;
  const className = "block min-w-0 rounded-maro20 border border-line bg-surface p-5 transition-colors hover:bg-surface-hover";
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

function receiptMonths(data: AnalyticsSnapshot) {
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", timeZone: data.timezone }).formatToParts(new Date(data.updatedAt));
  const year = Number(parts.find(part => part.type === "year")?.value); const month = Number(parts.find(part => part.type === "month")?.value);
  return Array.from({ length: 6 }, (_, index) => { const date = new Date(Date.UTC(year, month - 6 + index, 1)); const key = date.toISOString().slice(0, 7); return { label: key, value: data.byMonth.find(row => row.month === key && row.currency === "EUR")?.amount ?? 0 }; });
}

function BarChart({ rows, label, moneyValues = false }: { rows: Array<{ label: string; value: number }>; label: string; moneyValues?: boolean }) {
  const max = Math.max(1, ...rows.map(row => row.value)); const width = 640; const step = width / Math.max(1, rows.length);
  const format = (value: number) => moneyValues ? money(value) : number(value);
  return <figure><svg role="img" aria-label={label} viewBox="0 0 640 190" className="w-full overflow-visible"><line x1="0" x2="640" y1="160" y2="160" stroke="var(--maro-color-border-subtle)" />{rows.map((row, index) => { const height = row.value / max * 140; return <g key={row.label}><rect x={index * step + step * .15} y={160 - Math.max(1, height)} width={step * .7} height={Math.max(1, height)} rx="3" fill={row.value ? "var(--maro-color-accent)" : "var(--maro-color-border-subtle)"}><title>{row.label}: {format(row.value)}</title></rect>{(rows.length <= 6 || index === 0 || index === rows.length - 1 || (index % 7 === 0 && index < rows.length - 3)) && <text x={index * step + step / 2} y="183" textAnchor="middle" fontSize="12" fill="var(--maro-color-text-tertiary)">{row.label.slice(moneyValues ? 2 : 5)}</text>}</g>; })}<text x="0" y="10" fontSize="12" fill="var(--maro-color-text-tertiary)">{format(max === 1 && !rows.some(row => row.value) ? 0 : max)}</text></svg><details className="mt-3 text-xs text-ink-3"><summary className="cursor-pointer py-2">Shiko numrat e grafikut</summary><div className="mt-2 grid max-h-48 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto">{rows.map(row => <p key={row.label}>{row.label}: <strong>{format(row.value)}</strong></p>)}</div></details></figure>;
}
