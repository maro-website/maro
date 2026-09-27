"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import type { LoginAd } from "@/lib/loginAds/types";

type Draft = {
  id?: string;
  imageUrl: string;
  imagePath: string;
  externalUrl: string;
  weight: number;
  active: boolean;
  uploadDataUrl?: string;
};

const EMPTY_DRAFT: Draft = {
  imageUrl: "",
  imagePath: "",
  externalUrl: "",
  weight: 3,
  active: true,
};

function messageFor(error: string | undefined): string {
  if (error === "invalid-external-url") return "Shkruaj një link të plotë, p.sh. https://faqja.com";
  if (error === "invalid-image") return "Ngarko një imazh para se ta ruash reklamën.";
  if (error === "upload-failed") return "Imazhi nuk u ngarkua. Provo përsëri.";
  return "Diçka nuk shkoi mirë. Provo përsëri.";
}

export default function AdminLoginAdsPage() {
  const [ads, setAds] = React.useState<LoginAd[]>([]);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const headers = await adminAuthHeaders();
      const response = await fetch("/api/admin/login-ads", { headers, cache: "no-store" });
      const data = (await response.json()) as { ads?: LoginAd[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "load-failed");
      setAds(data.ads ?? []);
      setError("");
    } catch {
      setError("Reklamat nuk u ngarkuan.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => void load(), [load]);

  function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Lejohen vetëm JPG, PNG ose WebP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const uploadDataUrl = typeof reader.result === "string" ? reader.result : "";
      setDraft((current) => current ? { ...current, uploadDataUrl, imageUrl: uploadDataUrl } : current);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function save(next = draft) {
    if (!next || saving) return;
    if (!next.externalUrl.trim() || (!next.imageUrl && !next.uploadDataUrl)) {
      setError("Ngarko imazhin dhe shkruaj linkun e reklamës.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let imageUrl = next.imageUrl;
      let imagePath = next.imagePath;
      if (next.uploadDataUrl) {
        const uploadHeaders = await adminAuthHeaders(true);
        const uploadResponse = await fetch("/api/admin/ad-upload", {
          method: "POST",
          headers: uploadHeaders,
          body: JSON.stringify({ dataUrl: next.uploadDataUrl }),
        });
        const upload = (await uploadResponse.json()) as { url?: string; path?: string; error?: string };
        if (!uploadResponse.ok || !upload.url || !upload.path) {
          throw new Error(upload.error ?? "upload-failed");
        }
        imageUrl = upload.url;
        imagePath = upload.path;
      }

      const headers = await adminAuthHeaders(true);
      const response = await fetch("/api/admin/login-ads", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: next.id,
          imageUrl,
          imagePath,
          externalUrl: next.externalUrl,
          weight: next.weight,
          active: next.active,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "save-failed");
      setDraft(null);
      await load();
    } catch (caught) {
      setError(messageFor(caught instanceof Error ? caught.message : undefined));
    } finally {
      setSaving(false);
    }
  }

  async function remove(ad: LoginAd) {
    if (!window.confirm("A je i sigurt që do me e fshi këtë reklamë?")) return;
    setError("");
    try {
      const headers = await adminAuthHeaders();
      const response = await fetch(`/api/admin/login-ads?id=${encodeURIComponent(ad.id)}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error("delete-failed");
      if (draft?.id === ad.id) setDraft(null);
      await load();
    } catch {
      setError("Reklama nuk u fshi. Provo përsëri.");
    }
  }

  async function toggle(ad: LoginAd, active: boolean) {
    await save({ ...ad, active });
  }

  return (
    <div>
      <AdminPageHeader
        title="Login Ads"
        description="Imazhet në faqet e kyçjes. Ndryshojnë me çdo hapje sipas peshës."
        actions={
          <Button variant="brand" icon={<Plus size={17} />} onClick={() => setDraft({ ...EMPTY_DRAFT })}>
            Shto reklamë
          </Button>
        }
      />

      {draft ? (
        <section className="mb-5 rounded-maro16 border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold text-ink">{draft.id ? "Ndrysho reklamën" : "Reklamë e re"}</h2>
            <Button variant="ghost" size="icon" aria-label="Mbylle" onClick={() => setDraft(null)}><X size={18} /></Button>
          </div>

          <div className="mt-5 grid gap-5">
            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-3">Imazhi</div>
              <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-24 w-full items-center justify-center gap-2 rounded-maro16 border border-dashed border-line bg-surface-2 px-4 text-[14px] font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
              >
                <Upload size={18} /> Ngarko imazh (JPG/PNG/WebP)
              </button>
              {draft.imageUrl ? (
                <div className="mt-3 aspect-[860/627] max-h-[380px] overflow-hidden rounded-maro16 bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.imageUrl} alt="Pamja e reklamës" className="h-full w-full object-cover" />
                </div>
              ) : null}
            </div>

            <label className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-3">
              Linku i jashtëm
              <Input value={draft.externalUrl} placeholder="https://..." onChange={(event) => setDraft((current) => current ? { ...current, externalUrl: event.target.value } : current)} />
            </label>

            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-3">Pesha e shfaqjes</div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((weight) => (
                  <button
                    key={weight}
                    type="button"
                    onClick={() => setDraft((current) => current ? { ...current, weight } : current)}
                    className={`h-12 rounded-maro12 border text-[14px] font-semibold transition ${draft.weight === weight ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-3 hover:text-ink"}`}
                  >{weight}</button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-3">1 = shfaqet rrallë · 5 = shfaqet më shpesh</p>
            </div>

            <Switch checked={draft.active} onChange={(active) => setDraft((current) => current ? { ...current, active } : current)} label="Aktive" />
          </div>

          {error ? <p role="alert" className="mt-4 text-[13px] text-danger">{error}</p> : null}
          <div className="mt-5 flex gap-2">
            <Button variant="brand" className="flex-1" loading={saving} onClick={() => void save()}>{saving ? "Duke ruajtur…" : draft.id ? "Ruaj ndryshimet" : "Shto reklamën"}</Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>Anulo</Button>
          </div>
        </section>
      ) : error ? <p role="alert" className="mb-4 text-[13px] text-danger">{error}</p> : null}

      {loading ? <div className="text-[13px] text-ink-3">Duke i ngarkuar…</div> : null}
      {!loading && ads.length === 0 ? <AdminEmptyState title="Ende nuk ka reklama" description="Shto imazhin e parë për faqet e kyçjes." /> : null}
      <div className="space-y-3">
        {ads.map((ad) => (
          <article key={ad.id} className="flex flex-wrap items-center gap-4 rounded-maro16 border border-line bg-surface p-3 sm:p-4">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-maro12 bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold uppercase text-ink-2">Imazh</span>
                <span className="text-[12px] font-semibold text-ink-3">Pesha: {ad.weight}/5</span>
              </div>
              <div className="mt-2 truncate text-[13px] text-ink-2">{ad.externalUrl}</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ad.active} onChange={(active) => void toggle(ad, active)} aria-label={ad.active ? "Çaktivizo reklamën" : "Aktivizo reklamën"} />
              <Button variant="ghost" size="icon" aria-label="Ndrysho reklamën" onClick={() => setDraft({ ...ad })}><Pencil size={17} /></Button>
              <Button variant="ghost" size="icon" aria-label="Fshi reklamën" onClick={() => void remove(ad)}><Trash2 size={17} /></Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
