"use client";
import { AdminPrivateValue } from "@/components/admin/AdminPrivacy";

import * as React from "react";
import { RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Misc";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";
import { freebieErrorMessage, type FreebieDrop, type FreebieClaimsDirectory } from "@/lib/freebies/types";

const number = (value: number) => value.toLocaleString("sq-AL");
const date = (value: string) => new Date(value).toLocaleString("sq-AL", { dateStyle: "medium", timeStyle: "short" });

export function FreebieClaimsModal({ drop, onClose, initialView = "claims" }: { drop: FreebieDrop; onClose: () => void; initialView?: "claims" | "missed" }) {
  const [view, setView] = React.useState(initialView);
  const [offset, setOffset] = React.useState(0);
  const [data, setData] = React.useState<FreebieClaimsDirectory | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const request = React.useRef<AbortController | null>(null);
  const load = React.useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(""); setData(null);
    try {
      const headers = await adminAuthHeaders();
      if (controller.signal.aborted) return;
      const res = await fetch(`/api/admin/freebies/${encodeURIComponent(drop.id)}/claims?offset=${offset}&view=${view}`, {
        headers, cache: "no-store", signal: controller.signal,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "claims_unavailable");
      if (!controller.signal.aborted) setData(body);
    } catch (err) {
      const code = err instanceof Error ? err.message : "claims_unavailable";
      const known = ["forbidden", "insufficient_permission", "mfa_challenge_required", "mfa_enrollment_required", "rate_limited", "drop_not_found", "claims_unavailable"];
      if (!controller.signal.aborted) setError(freebieErrorMessage(known.includes(code) ? code : "claims_unavailable"));
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [drop.id, offset, view]);

  React.useEffect(() => { void load(); return () => request.current?.abort(); }, [load]);
  return <Modal open onClose={onClose} size="lg" aria-label={`Përdorimet e kodit ${drop.code}`}>
    <ModalHeader title="Interesimi për kodin" icon={<Users className="h-5 w-5" />} />
    <div className="space-y-5 px-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><p className="break-all font-mono text-lg font-bold text-ink">{drop.code}</p><p className="mt-1 break-words text-sm text-ink-3">{drop.title}</p></div>
        <Button variant="secondary" size="icon" aria-label="Rifresko përdorimet" icon={<RefreshCw className="h-4 w-4" />} disabled={loading} onClick={() => { if (offset) setOffset(0); else void load(); }} />
      </div>
      <div role="group" aria-label="Shfaq përdorimet ose interesimin" className="flex flex-wrap gap-2">{([['claims','E morën'],['missed','Pas limitit']] as const).map(([value,label]) => <Button key={value} variant={view === value ? "brand" : "secondary"} aria-pressed={view === value} onClick={() => { setOffset(0); setView(value); }}>{label}</Button>)}</div>
      {loading ? <div role="status" className="grid min-h-48 place-items-center"><Spinner /><span className="sr-only">Duke ngarkuar përdoruesit…</span></div>
        : error ? <div className="space-y-3"><p role="alert" className="text-sm text-danger">{error}</p><Button variant="secondary" onClick={() => void load()}>Provo përsëri</Button></div>
        : data && (view === "missed" ? <FreebieAttemptsList data={data} onOffsetChange={setOffset}/> : <FreebieClaimsList data={data} onOffsetChange={setOffset} />)}
    </div>
  </Modal>;
}

export function FreebieAttemptsList({ data, onOffsetChange }: { data: FreebieClaimsDirectory; onOffsetChange: (offset: number) => void }) {
  return <>
    <div className="grid grid-cols-2 gap-3 rounded-maro16 bg-surface-2 p-4"><div><p className="text-xs text-ink-3">Persona unikë</p><p className="mt-1 text-2xl font-bold text-ink"><AdminPrivateValue>{number(data.drop.missed_users ?? data.total)}</AdminPrivateValue></p></div><div><p className="text-xs text-ink-3">Tentime gjithsej</p><p className="mt-1 text-2xl font-bold text-ink"><AdminPrivateValue>{number(data.drop.missed_attempts ?? 0)}</AdminPrivateValue></p></div></div>
    <p className="text-sm leading-relaxed text-ink-3">Provuan kur të gjitha vendet ishin mbushur. Një person numërohet vetëm një herë; tentimet e përsëritura ruhen veçmas. Tentimet para aktivizimit të matjes nuk janë përfshirë.</p>
    {!data.total ? <p className="rounded-maro16 bg-surface-2 p-5 text-sm text-ink-2">Ende nuk ka tentime të regjistruara pas limitit.</p> : <>
      <ul aria-label="Personat që provuan pas limitit" className="divide-y divide-line border-y border-line">{data.attempts?.map(attempt => <li key={attempt.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-ink"><AdminPrivateValue>{attempt.user?.full_name || attempt.user?.username || attempt.user?.email || "Llogaria nuk është më e disponueshme"}</AdminPrivateValue></p>{attempt.user?.email && <p className="mt-1 break-all text-sm text-ink-2"><AdminPrivateValue>{attempt.user.email}</AdminPrivateValue></p>}{attempt.user?.username && <p className="mt-1 break-all text-xs text-ink-3"><AdminPrivateValue>@{attempt.user.username}</AdminPrivateValue></p>}</div><div className="sm:max-w-60 sm:text-right"><p className="text-sm font-semibold text-ink"><AdminPrivateValue>{number(attempt.attempts)}</AdminPrivateValue> tentime</p><p className="mt-1 text-xs text-ink-3">E fundit: <time dateTime={attempt.last_attempt_at}>{date(attempt.last_attempt_at)}</time></p><p className="mt-1 text-xs text-ink-3">E para: <time dateTime={attempt.first_attempt_at}>{date(attempt.first_attempt_at)}</time></p></div></li>)}</ul>
      {!data.attempts?.length && <p className="text-sm text-ink-2">Nuk ka persona në këtë faqe. Kthehu prapa ose rifresko listën.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-ink-3"><AdminPrivateValue>{data.attempts?.length ? `${number(data.offset + 1)}–${number(Math.min(data.offset + data.limit, data.total))}` : "0"}</AdminPrivateValue> nga <AdminPrivateValue>{number(data.total)}</AdminPrivateValue> · Tentimet e fundit në fillim</p><div className="flex gap-2"><Button variant="secondary" disabled={data.offset === 0} onClick={() => onOffsetChange(Math.max(0,data.offset-data.limit))}>Para</Button><Button variant="secondary" disabled={data.offset+data.limit>=data.total} onClick={() => onOffsetChange(data.offset+data.limit)}>Pas</Button></div></div>
    </>}
  </>;
}

export function FreebieClaimsList({ data, onOffsetChange }: { data: FreebieClaimsDirectory; onOffsetChange: (offset: number) => void }) {
  return <>
    <p className="text-sm text-ink-3"><strong className="text-ink"><AdminPrivateValue>{number(data.total)}</AdminPrivateValue></strong> përdorime · <strong className="text-ink"><AdminPrivateValue>{number(data.drop.credits_given)}</AdminPrivateValue></strong> kredite të dhëna</p>
    {!data.total ? <p className="rounded-maro16 bg-surface-2 p-5 text-sm text-ink-2">Askush nuk e ka përdorur ende këtë kod.</p>
      : <>
        <ul aria-label="Përdoruesit që e kanë përdorur kodin" className="divide-y divide-line border-y border-line">
          {data.claims.map(claim => <li key={claim.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-ink"><AdminPrivateValue>{claim.user?.full_name || claim.user?.username || claim.user?.email || "Llogaria nuk është më e disponueshme"}</AdminPrivateValue></p>
              {claim.user?.email && <p className="mt-1 break-all text-sm text-ink-2"><AdminPrivateValue>{claim.user.email}</AdminPrivateValue></p>}
              {claim.user?.username && <p className="mt-1 break-all text-xs text-ink-3"><AdminPrivateValue>@{claim.user.username}</AdminPrivateValue></p>}
            </div>
            <div className="shrink-0 sm:text-right"><p className="text-sm font-semibold text-ink"><AdminPrivateValue>{number(claim.credits)}</AdminPrivateValue> kredite</p><time dateTime={claim.claimed_at} className="mt-1 block text-xs text-ink-3">{date(claim.claimed_at)}</time></div>
          </li>)}
        </ul>
        {!data.claims.length && <p className="text-sm text-ink-2">Nuk ka përdorime në këtë faqe. Kthehu te faqja e mëparshme ose rifresko listën.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3"><AdminPrivateValue>{data.claims.length ? `${number(data.offset + 1)}–${number(Math.min(data.offset + data.limit, data.total))}` : "0"}</AdminPrivateValue> nga <AdminPrivateValue>{number(data.total)}</AdminPrivateValue> · Më të fundit në fillim</p>
          <div className="flex gap-2"><Button variant="secondary" disabled={data.offset === 0} onClick={() => onOffsetChange(Math.max(0, data.offset - data.limit))}>Para</Button><Button variant="secondary" disabled={data.offset + data.limit >= data.total} onClick={() => onOffsetChange(data.offset + data.limit)}>Pas</Button></div>
        </div>
      </>}
  </>;
}
