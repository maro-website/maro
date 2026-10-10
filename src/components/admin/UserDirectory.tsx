"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";


import * as React from "react";
import { Coins, HardDrive, RefreshCw, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { adminUserErrorMessage, type AdminDirectoryUser, type AdminUserDirectory } from "@/lib/admin/userDirectory";
import { UserPlanModal } from "./UserPlanModal";

const PAGE_SIZE = 50;
const planLabel = (plan: string) => ({ free: "Falas", standard: "Standard", pro: "Pro", business: "Business" })[plan] ?? plan;
const storageLabel = (bytes: number | null) => bytes == null ? "Pa limit" : `${(bytes / 1e9).toLocaleString("sq-AL", { maximumFractionDigits: 2 })} GB`;
type Action = "credits" | "storage" | "delete";

export function UserDirectory() {
  const { user: actor } = useMaro();
  const toast = useToast();
  const [data, setData] = React.useState<AdminUserDirectory | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [planUser, setPlanUser] = React.useState<AdminDirectoryUser | null>(null);
  const [action, setAction] = React.useState<{ kind: Action; user: AdminDirectoryUser } | null>(null);
  const [creatorBusy, setCreatorBusy] = React.useState<string | null>(null);
  const request = React.useRef(0);
  const load = React.useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&offset=${offset}&limit=${PAGE_SIZE}`, { headers: await adminAuthHeaders(), cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      if (current === request.current) setData(json);
    } catch { if (current === request.current) setError("Përdoruesit nuk u ngarkuan. Provo rifreskimin."); }
    finally { if (current === request.current) setLoading(false); }
  }, [search, offset]);
  React.useEffect(() => { void load(); }, [load]);

  async function toggleCreator(user: AdminDirectoryUser) {
    setCreatorBusy(user.id);
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: await adminAuthHeaders(true), body: JSON.stringify({ userId: user.id, isCreator: !user.is_creator }) });
      if (!response.ok) throw new Error();
      void load();
    } catch { toast.toast("Statusi i kreatorit nuk u ruajt.", "error"); }
    finally { setCreatorBusy(null); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-maro20 border border-line bg-surface p-5">
      <div className="flex items-center gap-3"><Users className="h-6 w-6 text-ink-3" /><div><p className="text-xl font-bold text-ink">{data?.total ?? "—"} përdorues{search ? " në kërkim" : " gjithsej"}</p><p className="text-sm text-ink-3">Plani, kreditet dhe hapësira në një vend.</p></div></div>
      <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={loading} onClick={() => void load()}>Rifresko</Button>
    </div>
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={event => { event.preventDefault(); setOffset(0); setSearch(query.trim()); }}>
      <Input aria-label="Kërko me emër ose email" placeholder="Kërko emër ose email…" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} className="flex-1" />
      <Button type="submit" variant="secondary" icon={<Search className="h-4 w-4" />}>Kërko</Button>
    </form>
    {error && <p role="alert" className="rounded-maro16 border border-danger bg-maro-danger p-4 text-danger">{error}</p>}
    {loading && !data ? <div className="flex min-h-48 items-center justify-center"><Spinner /></div> : !error && <>
      {!data?.users.length && <div className="rounded-maro20 border border-line bg-surface p-8 text-center text-ink-3">Nuk ka përdorues që përputhen me kërkimin.</div>}
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3" aria-busy={loading}>
        {data?.users.map(user => {
          const privileged = user.is_admin || Boolean(user.access_role);
          const ratio = user.storageLimitBytes == null ? 0 : user.storageLimitBytes === 0 ? (user.storageUsedBytes > 0 ? 100 : 0) : Math.min(100, user.storageUsedBytes / user.storageLimitBytes * 100);
          const overLimit = user.storageLimitBytes != null && user.storageUsedBytes > user.storageLimitBytes;
          return <article key={user.id} className="min-w-0 rounded-maro20 border border-line bg-surface p-5">
            <div className="mb-5 flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-lg font-bold text-ink">{user.full_name || "Pa emër"}</h2><p className="break-all text-sm text-ink-3">{user.email}</p></div>{privileged && <ShieldCheck aria-label="Llogari administrative" className="h-5 w-5 shrink-0 text-ink-3" />}</div>
            <div className="grid grid-cols-2 gap-3 rounded-maro16 bg-surface-2 p-4"><div><p className="text-xs text-ink-3">Plani aktual</p><p className="mt-1 text-lg font-bold text-ink">{planLabel(user.plan)}</p></div><div><p className="text-xs text-ink-3">Bilanci</p><p className="mt-1 text-lg font-bold tabular-nums text-ink">{user.credits.toLocaleString("sq-AL")} <span className="text-xs font-medium text-ink-3">kredite</span></p></div></div>
            <div className="my-4"><div className="flex items-center justify-between gap-2 text-xs text-ink-3"><span className="flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" />Storage</span><span>{storageLabel(user.storageUsedBytes)} / {storageLabel(user.storageLimitBytes)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className={`h-full rounded-full ${overLimit ? "bg-danger" : "bg-brand"}`} style={{ width: `${ratio}%` }} /></div>{overLimit && <p className="mt-1 text-xs text-danger">Mbi limitin · skedarët ekzistues ruhen.</p>}{user.storageOverrideBytes != null && <p className="mt-1 text-xs text-ink-3">Limit manual</p>}</div>
            <div className="mb-4 flex flex-wrap items-center gap-2"><Badge>{user.is_creator ? "Kreator" : "Përdorues"}</Badge><span className="text-xs text-ink-3">{user.planExpiresAt ? `Plani deri ${new Date(user.planExpiresAt).toLocaleDateString("sq-AL")}` : `Regjistruar ${new Date(user.created_at).toLocaleDateString("sq-AL")}`}</span></div>
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {data.canManage && <Button variant="secondary" onClick={() => setPlanUser(user)}>Ndrysho planin</Button>}
              {data.canAdjustCredits && <Button variant="secondary" icon={<Coins className="h-4 w-4" />} onClick={() => setAction({ kind: "credits", user })}>Kreditet</Button>}
              {data.canManage && <Button variant="secondary" onClick={() => setAction({ kind: "storage", user })}>Storage</Button>}
              {data.canManageCreators && <Button variant="ghost" loading={creatorBusy === user.id} onClick={() => void toggleCreator(user)}>{user.is_creator ? "Hiq kreatorin" : "Bëj kreator"}</Button>}
              {data.canManage && !privileged && user.id !== actor?.id && <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setAction({ kind: "delete", user })}>Fshi</Button>}
            </div>
          </article>;
        })}
      </div>
      {!!data?.total && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3">{offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} nga {data.total}</p><div className="flex gap-2"><Button variant="secondary" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Para</Button><Button variant="secondary" disabled={offset + PAGE_SIZE >= data.total || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>Pas</Button></div></div>}
    </>}
    {planUser && <UserPlanModal user={planUser} onClose={() => setPlanUser(null)} onChanged={() => void load()} />}
    {action && <UserActionModal key={`${action.kind}:${action.user.id}`} {...action} onClose={() => setAction(null)} onChanged={() => { setAction(null); void load(); }} />}
  </div>;
}

function UserActionModal({ kind, user, onClose, onChanged }: { kind: Action; user: AdminDirectoryUser; onClose: () => void; onChanged: () => void }) {
  const [mode, setMode] = React.useState("delta");
  const [amount, setAmount] = React.useState(kind === "storage" ? String((user.storageOverrideBytes ?? user.storageLimitBytes ?? 1e9) / 1e9) : "");
  const [defaultStorage, setDefaultStorage] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [mfaCode, setMfaCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const busy = React.useRef(false);
  const idempotencyKey = React.useRef(crypto.randomUUID());
  const changed = () => { idempotencyKey.current = crypto.randomUUID(); setError(""); };
  const number = Number(amount);
  const validAmount = amount.trim() !== "" && Number.isFinite(number) && (kind === "storage" ? number >= 0 && number <= 1000 : Number.isSafeInteger(number) && (mode === "delta" ? number !== 0 && user.credits + number >= 0 : number >= 0));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy.current) return; busy.current = true; setSaving(true); setError("");
    try {
      const body = kind === "delete" ? { userId: user.id, email: user.email, mfaCode } : kind === "storage" ? { userId: user.id, limitBytes: defaultStorage ? null : Math.round(number * 1e9), note: reason } : { userId: user.id, mode, delta: number, newBalance: number, reason, idempotencyKey: idempotencyKey.current };
      const url = kind === "credits" ? "/api/admin/credits/adjust" : `/api/admin/users/${kind}`;
      const response = await fetch(url, { method: "POST", headers: await adminAuthHeaders(true), body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onChanged();
    } catch (err) { setError(adminUserErrorMessage(err instanceof Error ? err.message : "failed")); setMfaCode(""); }
    finally { busy.current = false; setSaving(false); }
  }
  const ready = kind === "delete" ? /^\d{6}$/.test(mfaCode) : reason.trim().length >= 3 && ((kind === "storage" && defaultStorage) || validAmount);
  return <Modal open onClose={() => { if (!saving) onClose(); }} closeOnBackdrop={!saving} aria-label={kind === "delete" ? "Fshi përdoruesin" : "Menaxho përdoruesin"}>
    <ModalHeader title={kind === "credits" ? "Menaxho kreditet" : kind === "storage" ? "Limiti i storage" : "Fshi përdoruesin"} description={user.email} />
    <form className="space-y-5 px-6 pb-6" onSubmit={event => void submit(event)}>
      {kind === "delete" ? <><p className="rounded-maro16 border border-danger bg-maro-danger p-4 text-sm text-danger">Fshihen llogaria, krijimet dhe skedarët e këtij përdoruesi. Ky veprim nuk zhbëhet. Historiku i pagesave dhe krediteve ruhet për auditim.</p><Field label="Kodi MFA" hint="Kodi i ri me 6 shifra nga aplikacioni Authenticator."><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={event => setMfaCode(event.target.value.replace(/\D/g, ""))} /></Field></> : <>
        {kind === "credits" ? <Field label="Veprimi"><Select value={mode} onChange={event => { setMode(event.target.value); changed(); }}><option value="delta">Shto / hiq kredite</option><option value="set">Vendos bilancin</option></Select></Field> : <label className="flex min-h-11 items-center gap-3 text-sm text-ink"><input type="checkbox" checked={defaultStorage} onChange={event => { setDefaultStorage(event.target.checked); changed(); }} />Përdor limitin e planit aktual</label>}
        <Field label={kind === "storage" ? "Limiti në GB" : mode === "set" ? "Bilanci i ri" : "Ndryshimi i krediteve"} hint={kind === "storage" ? "1 GB = 1,000,000,000 bytes. Ulja e limitit nuk fshin skedarë ekzistues." : `Bilanci aktual: ${user.credits} kredite. ${mode === "delta" ? "Përdor numër negativ për të hequr kredite." : ""}`}><Input type="number" step={kind === "storage" ? "0.01" : "1"} disabled={kind === "storage" && defaultStorage} value={amount} onChange={event => { setAmount(event.target.value); changed(); }} /></Field>
        {kind === "credits" && validAmount && <p className="text-sm font-semibold text-ink">Bilanci pas ndryshimit: {mode === "set" ? number : user.credits + number} kredite</p>}
        <Field label="Arsyeja private" hint="Ruhet në historikun e adminit."><Textarea rows={3} maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); changed(); }} /></Field>
      </>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={saving} onClick={onClose}>Anulo</Button><Button type="submit" variant={kind === "delete" ? "danger" : "brand"} disabled={!ready} loading={saving}>{kind === "delete" ? "Konfirmo fshirjen" : "Ruaj ndryshimin"}</Button></div>
    </form>
  </Modal>;
}
