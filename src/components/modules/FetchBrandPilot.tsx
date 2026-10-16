"use client";

import * as React from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { getAccessToken } from "@/lib/supabase/client";
import { rateLimitedFetch } from "@/lib/client/rateLimit";
import { uploadSourceImage } from "@/lib/workspaces/brainService";
import { applyFetchedBrand, type FetchedBrand, type ImportTextKey } from "@/lib/brain-fetch/types";
import type { WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";

const labels: Record<ImportTextKey, string> = { name: "Emri", description: "Përshkrimi", website: "Website", phone: "Telefoni", location: "Lokacioni", language: "Gjuha" };
const messages: Record<string, string> = {
  invalid_url: "Shkruaj një adresë publike website-i, p.sh. biznesi.com.",
  site_blocked: "Faqja nuk lejon leximin automatik. Provo website-in e biznesit në vend të profilit social.",
  unsupported_content: "Ky link nuk ktheu një faqe të lexueshme. Provo faqen kryesore të biznesit.",
  page_too_large: "Logoja është tepër e madhe. Zgjidh një tjetër ose ngarkoje manualisht.",
  brand_not_found: "Nuk u gjetën të dhëna të mjaftueshme. Provo faqen kryesore të biznesit.",
  rate_limited: "E ke arritur limitin e provave. Provo përsëri më vonë.",
  brain_plan_required: "Për Fetch Brand të duhet një plan aktiv me maroBrain.",
  unsupported_logo: "Kjo logo nuk u lexua. Zgjidh një tjetër ose ngarkoje manualisht.",
  unauthorized: "Hyr përsëri në llogari dhe provo sërish.",
  not_found: "Fetch Brand ende nuk është i disponueshëm për këtë llogari.",
};
async function requestImport<T>(workspaceId: string, url: string, kind: "profile" | "logo", signal: AbortSignal): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error(messages.unauthorized);
  const res = await rateLimitedFetch(`/api/brain/fetch-brand${kind === "logo" ? "/logo" : ""}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ workspaceId, url }), signal, cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(messages[data.error] ?? "Importi nuk përfundoi. Provo përsëri ose përdor një website tjetër.");
  return data as T;
}

export function FetchBrandPilot({ workspaceId, profile, setProfile }: { workspaceId: string; profile: WorkspaceBrainProfile; setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>> }) {
  const [url, setUrl] = React.useState("");
  const [result, setResult] = React.useState<FetchedBrand | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [logoIndex, setLogoIndex] = React.useState(0);
  const [logo, setLogo] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false), [logoBusy, setLogoBusy] = React.useState(false), [applying, setApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null), [logoError, setLogoError] = React.useState<string | null>(null), [notice, setNotice] = React.useState<string | null>(null);
  const controller = React.useRef<AbortController | null>(null), logoController = React.useRef<AbortController | null>(null);
  const alive = React.useRef(true), applyingRef = React.useRef(false), fetchBusy = React.useRef(false);
  const latestProfile = React.useRef(profile);
  latestProfile.current = profile;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); logoController.current?.abort(); }; }, []);
  const close = React.useCallback(() => { if (!applyingRef.current) { setResult(null); logoController.current?.abort(); setLogo(null); } }, []);
  const toggle = (key: string) => setSelected(previous => previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key]);
  const run = async () => {
    if (!url.trim() || fetchBusy.current) return;
    fetchBusy.current = true; controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError(null); setNotice(null);
    try {
      const data = await requestImport<FetchedBrand>(workspaceId, url.trim(), "profile", AbortSignal.any([current.signal, AbortSignal.timeout(25000)]));
      if (!alive.current || current.signal.aborted) return;
      setLogo(null); setLogoError(null); setLogoIndex(0);
      // Existing nonempty values are unchecked so imports do not silently replace work.
      setSelected(Object.keys(data.fields).filter(key => !latestProfile.current.brand[key as ImportTextKey]?.trim()).concat(data.channels.length ? ["channels"] : [], data.colors.length && !latestProfile.current.brand.colors?.length ? ["colors"] : []));
      setResult(data);
    } catch (cause) { if (alive.current && !current.signal.aborted) setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Faqja po vonon. Provo përsëri."); }
    finally { fetchBusy.current = false; if (alive.current) setBusy(false); }
  };
  React.useEffect(() => {
    if (!result?.logos[logoIndex]) return;
    const current = new AbortController(); logoController.current = current;
    setLogo(null); setLogoBusy(true); setLogoError(null);
    void requestImport<{ dataUrl: string }>(workspaceId, result.logos[logoIndex].url, "logo", AbortSignal.any([current.signal, AbortSignal.timeout(12000)]))
      .then(data => { if (!current.signal.aborted) setLogo(data.dataUrl); })
      .catch(cause => { if (!current.signal.aborted) setLogoError(cause instanceof Error ? cause.message : "Logoja nuk u lexua."); })
      .finally(() => { if (!current.signal.aborted) setLogoBusy(false); });
    return () => current.abort();
  }, [result, logoIndex, workspaceId]);
  const apply = async () => {
    if (!result || applyingRef.current) return;
    applyingRef.current = true; setApplying(true); setError(null);
    try {
      let uploaded: { url: string; storageRef: string } | undefined;
      if (selected.includes("logo")) {
        if (!logo) throw new Error("Zgjidh një logo të lexueshme ose hiqe zgjedhjen e logos.");
        uploaded = await uploadSourceImage(logo, workspaceId) ?? undefined;
        if (!uploaded) throw new Error("Logoja nuk u ruajt. Provo përsëri.");
      }
      if (!alive.current) return;
      setProfile(latest => applyFetchedBrand(latest, result, selected, uploaded));
      setNotice("Të dhënat e zgjedhura u shtuan. Kontrollo gjendjen e ruajtjes së maroBrain.");
      setResult(null); setLogo(null);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Të dhënat nuk u shtuan."); }
    finally { applyingRef.current = false; if (alive.current) setApplying(false); }
  };
  return <section className="mb-8 space-y-3 rounded-maro16 bg-surface-2 p-4 sm:p-5" aria-labelledby="fetch-brand-title">
    <div className="flex flex-wrap items-center gap-2"><h2 id="fetch-brand-title" className="text-base font-semibold text-ink">Fetch Brand</h2><span className="rounded-full bg-surface px-2 py-1 text-xs text-ink-2">Pilot privat</span></div>
    <p className="text-sm leading-relaxed text-ink-2">Jep website-in e biznesit dhe kontrollo të dhënat para se t’i shtosh në maroBrain.</p>
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={event => { event.preventDefault(); void run(); }}>
      <label className="min-w-0 flex-1"><span className="sr-only">Website ose profil publik</span><input className="maro-input w-full" placeholder="biznesi.com" value={url} onChange={event => setUrl(event.target.value)} maxLength={2048} disabled={busy} autoComplete="off" inputMode="url" /></label>
      <Button type="submit" loading={busy} disabled={busy || !url.trim()} icon={<Search size={16} />}>{busy ? "Duke lexuar…" : "Fetch Brand"}</Button>
    </form>
    <p className="text-xs leading-relaxed text-ink-3">Pa AI dhe pa shpenzim kreditesh. Profilet sociale lexohen vetëm kur të dhënat janë publikisht të qasshme.</p>
    {!result && error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="text-sm text-ink-2">{notice}</p>}
    <Modal open={Boolean(result)} onClose={close} size="lg" aria-label="Kontrollo brandin e gjetur" closeOnBackdrop={!applying} hideClose={applying}>
      <ModalHeader title="Kontrollo brandin e gjetur" description="Zgjidh çka dëshiron të shtosh. Fushat e plotësuara më herët mbeten të pazgjedhura." />
      {result && <fieldset disabled={applying} className="space-y-5 px-6 pb-6"><legend className="sr-only">Të dhënat për import</legend>
        {Object.entries(result.fields).map(([key, fact]) => <div key={key} className="space-y-1 rounded-maro12 bg-surface-2 p-3">
          <label className="flex cursor-pointer items-start gap-3"><input className="maro-native-checkbox mt-1" type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} /><span className="min-w-0 flex-1"><span className="text-sm font-semibold text-ink">{labels[key as ImportTextKey]}{profile.brand[key as ImportTextKey]?.trim() ? " · zëvendëson vlerën aktuale" : ""}</span><span className="mt-1 block break-words text-sm text-ink-2">{fact.value}</span></span></label>
          <a className="ml-7 block break-all text-xs text-ink-3 underline" href={fact.source} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Burimi</a>
        </div>)}
        {result.channels.length > 0 && <label className="flex items-start gap-3"><input className="maro-native-checkbox mt-1" type="checkbox" checked={selected.includes("channels")} onChange={() => toggle("channels")} /><span className="min-w-0 text-sm text-ink"><span className="font-semibold">Shto kanalet sociale</span>{result.channels.map(channel => <span className="mt-1 block break-all text-ink-2" key={channel.handle}>{channel.platform}: {channel.handle}</span>)}</span></label>}
        {result.colors.length > 0 && <label className="flex items-start gap-3"><input className="maro-native-checkbox mt-1" type="checkbox" checked={selected.includes("colors")} onChange={() => toggle("colors")} /><span className="min-w-0 text-sm text-ink"><span className="font-semibold">Ngjyrat e gjetura</span><span className="mt-1 block text-ink-2">Janë kandidatë nga faqja; kontrollo a i përkasin brandit.</span><span className="mt-2 flex flex-wrap gap-2">{result.colors.map(color => <span className="inline-flex items-center gap-1.5 text-xs" key={color}><span className="h-5 w-5 rounded border border-line" style={{ backgroundColor: color }} />{color}</span>)}</span></span></label>}
        {result.logos.length > 0 && <div className="space-y-3 rounded-maro12 bg-surface-2 p-3">
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink"><input className="maro-native-checkbox" type="checkbox" checked={selected.includes("logo")} disabled={!logo || logoBusy} onChange={() => toggle("logo")} />{profile.brand.logoUrl ? "Zëvendëso logon aktuale" : "Shto logon"}</label>
          <label className="block text-sm text-ink-2">Kandidati për logo<select className="maro-input mt-2 w-full" value={logoIndex} onChange={event => { setLogoIndex(Number(event.target.value)); setSelected(previous => previous.filter(key => key !== "logo")); }}>{result.logos.map((item, index) => <option key={item.url} value={index}>{index + 1}. {item.kind === "icon" ? "Ikonë / favicon" : "Logo"} · {new URL(item.url).pathname.split("/").pop()?.slice(0, 60)}</option>)}</select></label>
          <div className="flex min-h-20 items-center justify-center rounded-maro12 bg-surface p-4">{logoBusy ? <p role="status" className="text-sm text-ink-3">Duke lexuar logon…</p> : logo ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={logo} alt="Logoja kandidate për import" className="max-h-24 max-w-full object-contain" /></> : <p className="text-sm text-ink-3">Pa parapamje</p>}</div>
          {logoError && <p role="alert" className="text-sm text-danger">{logoError}</p>}
        </div>}
        {result.warnings.map(warning => <p className="text-sm leading-relaxed text-ink-2" key={warning}>{warning}</p>)}
        <p className="text-xs text-ink-3">U lexuan {result.pages.length} faqe. Audienca, qëllimet dhe të dhënat që nuk gjenden nuk plotësohen automatikisht.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </fieldset>}
      <ModalFooter><Button variant="secondary" onClick={close} disabled={applying}>Anulo</Button><Button onClick={() => void apply()} disabled={applying || !selected.length || (selected.includes("logo") && (!logo || logoBusy))} loading={applying} icon={<Download size={16} />}>Shto të zgjedhurat</Button></ModalFooter>
    </Modal>
  </section>;
}
