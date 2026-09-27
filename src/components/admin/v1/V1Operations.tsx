"use client";
import * as React from "react";
import { adminRequest, Action, Section, inputClass } from "./shared";
export interface OperationalJob { id: string; createdAt: string; userId: string; module: string; model: string; provider: string; providerModelId: string; status: string; generationId: string | null; configuredCredits: number; charged: number; reserved: number; output: string; history: string; settlement: string; phase: string; failure: string | null; retainedOrphan: boolean; recoveredFromJobId: string | null; latencyMs: number | null; eligible: boolean }
interface Operations { counts: Record<string, number>; jobs: OperationalJob[]; recentReconciliation: Array<{ created_at: string; target_id: string; metadata: { result: string } }> }
const labels: Record<string, string> = { maro_imazh: "maroImazh", maro_logo: "maroLogo", flare: "Flare", sunburst: "Sunburst", settlementPending: "Settlement pending", history_failed: "History save failed", storage_failed: "Output storage failed", provider_failed: "Provider failed", provider_output_invalid: "Invalid provider output", execution_trace_unavailable: "Execution record unavailable", execution_interrupted: "Execution interrupted", settlement_pending: "Settlement pending", provider_succeeded: "Provider finished", persisted: "Result saved", other_failure: "Other failure" };
const label = (value: string) => labels[value] ?? value.replaceAll("_", " ");
export function OperationalJobRow({ job: j, busy, reconcile }: { job: OperationalJob; busy: boolean; reconcile: () => void }) {
  return <tr className="border-t border-line align-top"><td className="p-3"><div>{new Date(j.createdAt).toLocaleString()}</div><details className="mt-2 text-xs"><summary>Identifiers</summary><div className="max-w-xs break-all">Job: {j.id}<br />User: {j.userId}<br />Generation: {j.generationId ?? "missing"}<br />Provider model: {j.providerModelId}{j.recoveredFromJobId && <p>Recovered from: {j.recoveredFromJobId}</p>}</div></details></td>
    <td className="p-3">{label(j.module)}<br />{label(j.model)} · {j.provider}<br />{j.latencyMs != null ? `${j.latencyMs} ms` : "Latency unavailable"}</td>
    <td className="p-3">{j.status}<br /><span className="text-xs">{j.failure ? label(j.failure) : j.phase && j.phase !== j.status ? label(j.phase) : ""}</span>{j.retainedOrphan && <p className="font-semibold">Retained output without history</p>}{j.recoveredFromJobId && <p>Recovered saved result</p>}</td>
    <td className="p-3">Output: {j.output}<br />History: {j.history}<br />Settlement: {j.settlement}</td>
    <td className="p-3">Configured: {j.configuredCredits}<br />Charged: {j.charged}<br />Reserved: {j.reserved}</td>
    <td className="p-3">{j.eligible ? <Action disabled={busy} onClick={reconcile}>Reconcile</Action> : ["completed", "failed", "cancelled"].includes(j.status) ? "Terminal" : "Active; not yet eligible"}</td></tr>;
}
export function V1Operations({ compact = false }: { compact?: boolean }) {
  const [data, setData] = React.useState<Operations | null>(null); const [busy, setBusy] = React.useState(false); const [message, setMessage] = React.useState(""); const [status, setStatus] = React.useState(""); const [before, setBefore] = React.useState("");
  const load = React.useCallback(async () => { setBusy(true); try { setData(await adminRequest<Operations>(`/api/admin/v1/operations?status=${status}&before=${before}`)); } catch (e) { setMessage((e as Error).message); setData(null); } finally { setBusy(false); } }, [status, before]);
  React.useEffect(() => { void load(); }, [load]);
  const reconcile = async (id: string) => { setBusy(true); try { const r = await adminRequest<{ result: string }>("/api/admin/v1/operations", "POST", { jobId: id }); setMessage(`Reconciliation: ${r.result}`); await load(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  return <div className={compact ? "space-y-5" : "space-y-5 p-6"}><Section title="Generations">
    <p className="text-sm text-ink-3">V1 durable jobs. Scheduled reconciliation is configured every ten minutes; deployed delivery remains unverified.</p>
    <p role="status">{message}</p>
    <div className="flex flex-wrap gap-4 text-sm">{Object.entries(data?.counts ?? {}).map(([key, value]) => <span key={key}>{label(key)}: <strong>{value}</strong></span>)}</div>
    <div className="flex gap-3"><select aria-label="Job status" className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setBefore(""); }}><option value="">All statuses</option>{["completed", "failed", "pending", "reserved", "processing", "cancelled"].map((s) => <option key={s}>{s}</option>)}</select><Action disabled={busy} onClick={() => void load()}>Refresh</Action></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Time / identifiers", "Module / model", "State", "Persistence / settlement", "Credits", "Action"].map((v) => <th key={v} className="p-3">{v}</th>)}</tr></thead><tbody>{data?.jobs.slice(0, compact ? 5 : 50).map((j) => <OperationalJobRow job={j} key={j.id} busy={busy} reconcile={() => void reconcile(j.id)} />)}</tbody></table></div>
    {data && !data.jobs.length && <p>No jobs in this view.</p>}
    {!compact && <div className="flex gap-2"><Action disabled={busy || !before} onClick={() => setBefore("")}>Newest</Action><Action disabled={busy || (data?.jobs.length ?? 0) < 50} onClick={() => setBefore(data!.jobs.at(-1)!.createdAt)}>Older</Action></div>}
  </Section><Section title="Known reconciliation activity">
    {data?.recentReconciliation.length ? data.recentReconciliation.map((r, i) => <p className="break-all text-sm" key={i}>{new Date(r.created_at).toLocaleString()} · {r.target_id} · {r.metadata.result}</p>) : <p className="text-sm text-ink-3">No recorded manual reconciliation. Historical scheduler activity was not recorded.</p>}
    <p className="text-xs text-ink-3">Reconciliation is available only for pending jobs at least 15 minutes old. The database rechecks eligibility and prevents duplicate settlement. Retained output files are never deleted here.</p>
  </Section></div>;
}
