"use client";

import * as React from "react";
import { Gift, Plus, Copy, Pause, Play, RefreshCw, Search, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";
import { freebieErrorMessage, type FreebieDrop } from "@/lib/freebies/types";

type Target = NonNullable<FreebieDrop["target"]>;
type Plan = { id: string; display_name: string; duration_days: number };
type Directory = { drops: FreebieDrop[]; total: number; plans: Plan[] };
const number = (n: number) => n.toLocaleString("sq-AL");
const date = (value: string) => new Date(value).toLocaleString("sq-AL", { dateStyle: "medium", timeStyle: "short" });
function dropStatus(drop: FreebieDrop) {
  if (drop.audience === "user" && !drop.target) return "Llogaria u fshi";
  if (drop.claims_count >= drop.max_claims) return "Përfunduar";
  if (drop.expires_at && Date.parse(drop.expires_at) <= Date.now()) return "Skaduar";
  if (!drop.active) return "Pauzuar";
  if (Date.parse(drop.starts_at) > Date.now()) return "Në pritje";
  return "Aktiv";
}

export function FreebiesPanel() {
  const [data, setData] = React.useState<Directory | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [busy, setBusy] = React.useState<string | null>(null);
  const { toast } = useToast();
  const request = React.useRef(0);
  const active = React.useRef(true);
  const load = React.useCallback(async () => {
    const current = ++request.current; setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/freebies?offset=${offset}`, { headers: await adminAuthHeaders(), cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (active.current && current === request.current) setData(body);
    } catch (err) { if (active.current && current === request.current) setError(freebieErrorMessage(err instanceof Error ? err.message : "freebies_unavailable")); }
    finally { if (active.current && current === request.current) setLoading(false); }
  }, [offset]);
  React.useEffect(() => { active.current = true; void load(); return () => { active.current = false; }; }, [load]);

  async function toggle(drop: FreebieDrop) {
    setBusy(drop.id);
    try {
      const res = await fetch("/api/admin/freebies", { method: "PATCH", headers: await adminAuthHeaders(true), body: JSON.stringify({ id: drop.id, active: !drop.active }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      toast(drop.active ? "Kodi u ndal." : "Kodi u aktivizua."); void load();
    } catch (err) { toast(freebieErrorMessage(err instanceof Error ? err.message : "freebies_unavailable"), "error"); }
    finally { setBusy(null); }
  }
  async function copyLink(drop: FreebieDrop) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/bonus?code=${encodeURIComponent(drop.code)}`); toast("Linku u kopjua."); }
    catch { toast("Linku nuk u kopjua. Përdor kodin që shfaqet në kartë.", "error"); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-maro20 border border-line bg-surface p-5">
      <div className="flex items-center gap-3"><Gift className="h-6 w-6 text-brand" /><div><h2 className="text-xl font-bold text-ink">Code Drops</h2><p className="mt-1 text-sm text-ink-3">{data ? `${number(data.total)} kode` : "Promovime publike dhe kode personale"}</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={loading} onClick={() => void load()}>Rifresko</Button><Button variant="brand" icon={<Plus className="h-4 w-4" />} disabled={!data || loading} onClick={() => setCreating(true)}>Krijo Code Drop</Button></div>
    </div>
    {error && <p role="alert" className="rounded-maro16 border border-danger bg-maro-danger p-4 text-danger">{error}</p>}
    {loading && !data ? <div className="grid min-h-48 place-items-center"><Spinner /></div> : !error && <>
      {!data?.drops.length && <div className="maro-panel p-8 text-center text-ink-3">Ende nuk ka Code Drops. Krijo kodin e parë.</div>}
      <div className="grid gap-4 xl:grid-cols-2" aria-busy={loading}>{data?.drops.map(drop => {
        const status = dropStatus(drop);
        const finished = ["Përfunduar", "Skaduar", "Llogaria u fshi"].includes(status);
        return <article key={drop.id} className="min-w-0 rounded-maro20 border border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-all font-mono text-xl font-bold text-ink">{drop.code}</h3><p className="mt-1 break-words text-sm text-ink-3">{drop.title}</p></div><Badge>{status}</Badge></div>
          <div className="my-5 grid grid-cols-2 gap-4 rounded-maro16 bg-surface-2 p-4"><div><p className="text-xs text-ink-3">Kredite për përdorues</p><p className="mt-1 text-2xl font-bold text-ink">{number(drop.credits)}</p></div><div><p className="text-xs text-ink-3">Përdorime</p><p className="mt-1 text-2xl font-bold text-ink">{number(drop.claims_count)} <span className="text-sm font-medium text-ink-3">/ {number(drop.max_claims)}</span></p></div></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, drop.claims_count / drop.max_claims * 100)}%` }} /></div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-ink-3"><span>Dhënë: <strong className="text-ink">{number(drop.claims_count * drop.credits)}</strong> kredite</span><span>Maksimum: <strong className="text-ink">{number(drop.max_claims * drop.credits)}</strong> kredite</span></div>
          <dl className="my-5 space-y-3 text-sm"><div><dt className="text-xs text-ink-3">Për kë</dt><dd className="mt-1 break-words text-ink">{drop.audience === "all" ? "100% publike · çdo llogari vetëm një herë" : drop.target ? `${drop.target.email}${drop.target.username ? ` · @${drop.target.username}` : ""}` : "Llogaria e synuar nuk ekziston më"}</dd></div>
            <div><dt className="text-xs text-ink-3">Aktiviteti në 7 ditët e fundit</dt><dd className="mt-1 text-ink">{drop.min_generations_7d ? `Të paktën ${number(drop.min_generations_7d)} gjenerime të përfunduara` : "Pa kusht aktiviteti"}</dd></div>
            <div><dt className="text-xs text-ink-3">Plani</dt><dd className="mt-1 text-ink">{drop.plan_id ? `${data.plans.find(plan => plan.id === drop.plan_id)?.display_name ?? drop.plan_id} · ${drop.plan_days} ditë` : "Vetëm kredite"}</dd></div>
            <div><dt className="text-xs text-ink-3">Afati</dt><dd className="mt-1 text-ink">{drop.expires_at ? `Deri më ${date(drop.expires_at)}` : "Pa afat skadimi"}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4"><Button variant="secondary" icon={<Copy className="h-4 w-4" />} disabled={status !== "Aktiv"} onClick={() => void copyLink(drop)}>Kopjo linkun</Button><Button variant="secondary" icon={drop.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} disabled={finished || busy !== null} loading={busy === drop.id} onClick={() => void toggle(drop)}>{drop.active ? "Ndalo kodin" : "Aktivizo kodin"}</Button></div>
        </article>;
      })}</div>
      {!!data?.total && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3">{offset + 1}–{Math.min(offset + 50, data.total)} nga {data.total}</p><div className="flex gap-2"><Button variant="secondary" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 50))}>Para</Button><Button variant="secondary" disabled={offset + 50 >= data.total || loading} onClick={() => setOffset(offset + 50)}>Pas</Button></div></div>}
    </>}
    {creating && data && <CreateDropModal plans={data.plans} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); if (offset) setOffset(0); else void load(); }} />}
  </div>;
}

function CreateDropModal({ plans, onClose, onCreated }: { plans: Plan[]; onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [credits, setCredits] = React.useState("10");
  const [maxClaims, setMaxClaims] = React.useState("100");
  const [minGenerations, setMinGenerations] = React.useState("0");
  const [personal, setPersonal] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<Target[]>([]);
  const [target, setTarget] = React.useState<Target | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [planId, setPlanId] = React.useState("");
  const [planDays, setPlanDays] = React.useState("30");
  const [expiry, setExpiry] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const request = React.useRef({ id: crypto.randomUUID(), startsAt: new Date().toISOString() });
  const searchRequest = React.useRef(0);
  const saveBusy = React.useRef(false);
  const { toast } = useToast();
  const claimLimit = personal ? 1 : Number(maxClaims);
  const budget = Number(credits) * claimLimit;

  async function searchUsers() {
    const current = ++searchRequest.current; setSearching(true); setError(""); setUsers([]);
    try {
      const res = await fetch(`/api/admin/freebies/users?q=${encodeURIComponent(query.trim())}`, { headers: await adminAuthHeaders(), cache: "no-store" });
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      if (current === searchRequest.current) setUsers(body.users);
    } catch (err) { if (current === searchRequest.current) setError(freebieErrorMessage(err instanceof Error ? err.message : "users_unavailable")); }
    finally { if (current === searchRequest.current) setSearching(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saveBusy.current || (personal && !target)) return;
    saveBusy.current = true; setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/freebies", { method: "POST", headers: await adminAuthHeaders(true), body: JSON.stringify({
        ...request.current, code: code.trim().toUpperCase(), title: title.trim(), credits: Number(credits), maxClaims: claimLimit,
        minGenerations: Number(minGenerations), targetUserId: personal ? target!.id : null,
        planId: planId || null, planDays: planId ? Number(planDays) : null, expiresAt: expiry ? new Date(expiry).toISOString() : null,
      }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      toast("Code Drop u krijua."); onCreated();
    } catch (err) { setError(freebieErrorMessage(err instanceof Error ? err.message : "freebies_unavailable")); }
    finally { saveBusy.current = false; setSaving(false); }
  }

  return <Modal open onClose={() => { if (!saveBusy.current) onClose(); }} size="lg" closeOnBackdrop={!saving} hideClose={saving} aria-label="Krijo Code Drop">
    <ModalHeader title="Krijo Code Drop" description="Një kod publik ose një dhuratë vetëm për përdoruesin që zgjedh." icon={<Gift className="h-5 w-5" />} />
    <form onSubmit={event => void save(event)} className="space-y-5 px-6 pb-6">
      <Field label="Emri i promovimit"><Input required minLength={3} maxLength={160} value={title} disabled={saving} onChange={event => setTitle(event.target.value)} placeholder="P.sh. Launch në TRAMPOLINE" /></Field>
      <Field label="Kodi" hint="Shkronja, numra, - ose _. Kodi nuk ndryshon pasi krijohet."><div className="flex flex-wrap gap-2"><Input required pattern="[A-Z0-9][A-Z0-9_-]{2,63}" minLength={3} maxLength={64} value={code} disabled={saving} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="TRAMPOLINE" className="min-w-0 flex-1" autoComplete="off" /><Button variant="secondary" disabled={saving} icon={<WandSparkles className="h-4 w-4" />} onClick={() => setCode(`MARO-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`)}>Gjenero kod</Button></div></Field>
      <Field label="Për kë vlen"><Select value={personal ? "user" : "all"} disabled={saving} onChange={event => { setPersonal(event.target.value === "user"); setTarget(null); setUsers([]); }}><option value="all">Për të gjithë · Code Drop publik</option><option value="user">Vetëm për një përdorues</option></Select></Field>
      {personal && <div className="space-y-3 rounded-maro16 border border-line bg-surface-2 p-4"><Field label="Kërko username ose email" hint="Zgjidh përdoruesin para se ta krijosh linkun."><div className="flex gap-2"><Input aria-label="Username ose email" value={query} disabled={saving} onChange={event => { setQuery(event.target.value); setTarget(null); setUsers([]); searchRequest.current++; setSearching(false); }} maxLength={100} placeholder="erzenology ose email…" className="min-w-0 flex-1" /><Button variant="secondary" size="icon" aria-label="Kërko përdoruesin" icon={<Search className="h-4 w-4" />} loading={searching} disabled={saving || query.trim().length < 2} onClick={() => void searchUsers()} /></div></Field>
        {users.map(user => <button key={user.id} type="button" disabled={saving} aria-pressed={target?.id === user.id} onClick={() => setTarget(user)} className={`block w-full rounded-maro12 border p-3 text-left ${target?.id === user.id ? "border-brand bg-surface" : "border-line bg-surface"}`}><span className="block break-all text-sm font-bold text-ink">{user.email}</span><span className="mt-1 block text-xs text-ink-3">{user.username ? `@${user.username} · ` : ""}{user.full_name}</span></button>)}
        {target && <p className="break-all text-sm text-ink">Linku do të vlejë vetëm për <strong>{target.email}</strong>, një herë.</p>}
      </div>}
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Kredite për përdorues"><Input required type="number" min={1} max={10000} step={1} value={credits} disabled={saving} onChange={event => setCredits(event.target.value)} /></Field><Field label="Sa persona mund t’i marrin"><Input required type="number" min={1} max={100000} step={1} value={personal ? "1" : maxClaims} disabled={saving || personal} onChange={event => setMaxClaims(event.target.value)} /></Field><Field label="Gjenerime në 7 ditët e fundit" hint="0 = pa kusht aktiviteti."><Input required type="number" min={0} max={10000} step={1} value={minGenerations} disabled={saving} onChange={event => setMinGenerations(event.target.value)} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Aktivizo edhe një plan" hint="Plani jepet pa pagesë. Nuk zëvendëson një plan aktiv."><Select value={planId} disabled={saving} onChange={event => { setPlanId(event.target.value); setPlanDays(String(plans.find(plan => plan.id === event.target.value)?.duration_days ?? 30)); }}><option value="">Jo · vetëm kredite</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.display_name}</option>)}</Select></Field>{planId && <Field label="Kohëzgjatja e planit · ditë"><Input required type="number" min={1} max={365} step={1} value={planDays} disabled={saving} onChange={event => setPlanDays(event.target.value)} /></Field>}</div>
      <Field label="Afati i kodit · opsional" hint="Bosh = pa afat skadimi. Kodi aktivizohet menjëherë."><Input type="datetime-local" value={expiry} disabled={saving} onChange={event => setExpiry(event.target.value)} /></Field>
      <div className="rounded-maro16 bg-surface-2 p-4"><p className="text-sm text-ink-3">Buxheti maksimal</p><p className="mt-1 text-xl font-bold text-ink">{Number.isFinite(budget) ? number(budget) : "—"} kredite</p><p className="mt-2 text-xs leading-relaxed text-ink-3">{Number(credits) || 0} kredite × {claimLimit || 0} persona. Kreditët shtohen vetëm kur përdoruesi e merr kodin.{planId ? " Sasia e krediteve është vetëm kjo që cakton këtu, pa kredite shtesë nga plani." : ""}</p></div>
      {error && <p role="alert" className="rounded-maro12 border border-danger bg-maro-danger p-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={saving} onClick={onClose}>Anulo</Button><Button type="submit" variant="brand" loading={saving} disabled={personal && !target}>Krijo dhe aktivizo</Button></div>
    </form>
  </Modal>;
}
