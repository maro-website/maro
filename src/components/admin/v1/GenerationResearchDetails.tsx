"use client";

import * as React from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useAdminPrivacy } from "@/components/admin/AdminPrivacy";
import type { GenerationResearch } from "@/lib/admin/generationResearch";
import { Action, adminRequest } from "./shared";

const missing = "Nuk është ruajtur";
const yesNo = (value: boolean | null) => value === null ? missing : value ? "Po" : "Jo";
const date = (value: string | null) => value ? new Date(value).toLocaleString() : missing;

function Facts({ title, rows }: { title: string; rows: Array<[string, React.ReactNode]> }) {
  return <section className="min-w-0 space-y-3"><h3 className="font-semibold text-ink">{title}</h3><dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-ink-3">{label}</dt><dd className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{value ?? missing}</dd></div>)}</dl></section>;
}

export function GenerationResearchContent({ data: d }: { data: GenerationResearch }) {
  return <div className="space-y-6">
    <Facts title="Përdoruesi" rows={[
      ["Emri", d.user.name], ["Email", d.user.email], ["User ID", d.userId], ["Regjistruar", date(d.user.joinedAt)],
      ["Plani aktual", d.user.currentPlan], ["Plani skadon", date(d.user.planExpiresAt)],
      ["Kreditë aktuale", d.user.currentCredits], ["Gjenerime V1 të regjistruara", d.user.recordedGenerations],
      ["Creator", yesNo(d.user.creator)], ["Workspace", d.workspace ? `${d.workspace.name} · ${d.workspace.id}` : missing],
    ]} />
    {!d.user.profileAvailable && <p className="text-sm text-ink-3">Profili nuk është më i disponueshëm. Identifikuesi vjen nga gjenerimi.</p>}
    <p className="text-xs text-ink-3">Plani, bilanci dhe emri i workspace-it janë aktualë. Opsionet më poshtë janë ato të ruajtura për këtë kërkesë.</p>
    {[["Kërkesa origjinale e përdoruesit", d.originalPrompt], ["Prompti i dërguar te modeli", d.providerPrompt]].map(([title, prompt]) => <section key={title} className="min-w-0 rounded-maro12 border border-line bg-surface-2 p-4"><h3 className="font-semibold text-ink">{title}</h3><p className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{prompt ?? (title === "Prompti i dërguar te modeli" ? "Prompti final nuk është i disponueshëm në gjurmën e ruajtur të këtij gjenerimi." : missing)}</p></section>)}
    {d.revision && <Facts title="Rishikimi" rows={[["Kërkesa e ndryshimit", d.revision], ["Biseda", d.conversationId]]} />}
    <Facts title="Kërkesa dhe modeli" rows={[
      ["Moduli", d.module], ["Modeli", d.model], ["Provider", d.provider], ["Modeli i providerit", d.providerModel],
      ["Veprimi", d.operation], ["Madhësia", d.size], ["Cilësia", d.quality], ["Numri i imazheve", d.imageCount],
      ["Referenca nga përdoruesi", d.referenceCount], ["Brain i kërkuar", yesNo(d.brainRequested)], ["Brain i përdorur", yesNo(d.brainUsed)],
      ["Preset ID", d.presetId], ["Stili", d.styleTitle ?? d.styleId], ["Style ID", d.styleId],
    ]} />
    <Facts title="Opsionet e zgjedhura" rows={Object.entries(d.selections)} />
    {d.logoAnswers && Object.entries(d.logoAnswers).map(([group, answers]) => <Facts key={group} title={`maroLogo · ${group}`} rows={Object.entries(answers)} />)}
    <Facts title="Ekzekutimi dhe kreditë" rows={[
      ["Statusi", d.status], ["Faza", d.phase], ["Krijuar", date(d.createdAt)], ["Filluar", date(d.startedAt)], ["Përfunduar", date(d.finishedAt)],
      ["Kohëzgjatja e providerit", d.latencyMs == null ? null : `${d.latencyMs.toLocaleString()} ms`],
      ["Kredi të konfiguruara", d.configuredCredits], ["Kredi të ngarkuara", d.charged], ["Kredi të rezervuara", d.reserved],
      ["Kosto e vlerësuar (USD)", d.estimatedCostUsd == null ? null : `$${d.estimatedCostUsd}`],
      ["Burimi i vlerësimit", d.costSource], ["Versioni i tarifës", d.costRateVersion],
      ["Input tokens", d.inputTokens], ["Output tokens", d.outputTokens], ["Kodi i gabimit te provideri", d.providerErrorCode], ["HTTP i providerit", d.providerErrorStatus],
    ]} />
    <p className="text-xs text-ink-3">Kostoja USD është vlerësim nga përdorimi dhe tarifat e ruajtura. Shuma e faturuar nga provideri nuk ruhet këtu.</p>
    <details className="text-sm"><summary className="cursor-pointer font-semibold">Identifikuesit teknikë</summary><div className="mt-3"><Facts title="Gjurmimi" rows={[
      ["Job ID", d.jobId], ["Generation ID", d.generationId], ["Request ID", d.requestId], ["Provider request ID", d.providerRequestId],
      ["Versioni i system prompt", d.systemVersion], ["Prompt SHA-256", d.promptHash], ["Biseda", d.conversationId],
    ]} /></div></details>
  </div>;
}

function LoadedDetails({ jobId }: { jobId: string }) {
  const [data, setData] = React.useState<GenerationResearch | null>(null);
  const [error, setError] = React.useState("");
  const [attempt, retry] = React.useReducer(value => value + 1, 0);
  React.useEffect(() => {
    let active = true;
    setData(null); setError("");
    void adminRequest<GenerationResearch>(`/api/admin/v1/operations/${jobId}/details`).then(result => { if (active) setData(result); }).catch(() => {
      if (active) setError("Detajet nuk u ngarkuan. Kontrollo qasjen/MFA dhe provo përsëri.");
    });
    return () => { active = false; };
  }, [jobId, attempt]);
  return error ? <div role="alert" className="space-y-3"><p>{error}</p><Action onClick={retry}>Riprovo</Action></div> : data ? <GenerationResearchContent data={data} /> : <p role="status">Duke ngarkuar detajet…</p>;
}

export function GenerationResearchDetails({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { hidden } = useAdminPrivacy();
  return <Modal open onClose={onClose} size="lg" aria-label="Detajet e gjenerimit"><ModalHeader title="Detajet e gjenerimit" description="Përdoruesi, kërkesa dhe ekzekutimi i ruajtur." /><div className="min-w-0 px-5 pb-6 sm:px-6">{hidden ? <p>Shfaq vlerat private nga ikona e syrit për të hapur detajet.</p> : <LoadedDetails jobId={jobId} />}</div></Modal>;
}
