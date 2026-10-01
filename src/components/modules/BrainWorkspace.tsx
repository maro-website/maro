"use client";

import * as React from "react";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { MARO_PRODUCTS } from "@/lib/design/maro-system";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { useToast } from "@/components/ui/Toast";
import {
  BRAIN_TABS,
  BRAIN_CATEGORIES,
  BRAIN_BUSINESS_MODELS,
  emptyBrainProfile,
  type BrainTabId,
  type WorkspaceBrainProfile,
  type WorkspaceSource,
  type SalesChannel,
} from "@/lib/workspaces/brainTypes";
import { brainProgress } from "@/lib/workspaces/brainProfile";
import {
  addWorkspaceSource,
  deleteWorkspaceSource,
  fetchBrainProfile,
  fetchWorkspaceSources,
  saveBrainProfile,
  uploadSourceImage,
} from "@/lib/workspaces/brainService";
import { uid } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { readBrainDraft, writeBrainDraft, clearSavedBrainDraft, recoverLegacyBrainDraft } from "@/lib/workspaces/brainDraft";
import { workspaceErrorMessage } from "@/lib/workspaces/request";

const SALES_OPTIONS: { id: SalesChannel; label: string }[] = [
  { id: "ONLINE", label: "ONLINE" },
  { id: "FIZIKISHT", label: "FIZIKISHT" },
  { id: "HYBRID", label: "HYBRID" },
];

const CHANNEL_PLATFORMS = ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube"];

export function BrainWorkspace() {
  const { user } = useMaro();
  const { activeWorkspace } = useWorkspace();
  return <BrainWorkspaceEditor key={`${user?.id ?? "guest"}:${activeWorkspace?.id ?? "none"}`} />;
}

function BrainWorkspaceEditor() {
  const { user } = useMaro();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { toast } = useToast();
  const workspaceId = activeWorkspace?.id;
  const userId = user?.id;

  const [tab, setTab] = React.useState<BrainTabId>("brand");
  const [profile, setProfileState] = React.useState<WorkspaceBrainProfile>(() =>
    userId && workspaceId ? readBrainDraft(userId, workspaceId) ?? emptyBrainProfile() : emptyBrainProfile()
  );
  const profileRef = React.useRef(profile);
  const dirtyRef = React.useRef(Boolean(userId && workspaceId && readBrainDraft(userId, workspaceId)));
  const storageWarning = React.useRef(false);
  const setProfile = React.useCallback<React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>>((update) => {
    const next = typeof update === "function" ? update(profileRef.current) : update;
    profileRef.current = next;
    dirtyRef.current = true;
    setProfileState(next);
    if (userId && workspaceId && !writeBrainDraft(userId, workspaceId, next) && !storageWarning.current) {
      storageWarning.current = true;
      toast("Shfletuesi nuk po e ruan draftin. Shtyp Ruaje para se të largohesh.", "error");
    }
  }, [userId, workspaceId, toast]);
  const [sources, setSources] = React.useState<WorkspaceSource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const mounted = React.useRef(true);
  const canAutosave = React.useRef(false);
  canAutosave.current = !loading && !loadError;
  const inFlight = React.useRef<{ profile: WorkspaceBrainProfile; task: Promise<void> } | null>(null);

  const progress = brainProgress(profile, sources.length);

  const refreshSources = React.useCallback(async () => {
    if (!userId || !workspaceId) return;
    setSources(await fetchWorkspaceSources(userId, workspaceId));
  }, [userId, workspaceId]);

  React.useEffect(() => {
    if (!userId || !workspaceId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    void Promise.all([
      fetchBrainProfile(userId, workspaceId),
      fetchWorkspaceSources(userId, workspaceId),
    ]).then(([p, s]) => {
      if (!active) return;
      // Server hydration and source refreshes must never overwrite an unsaved draft.
      if (!dirtyRef.current) {
        const recovered = recoverLegacyBrainDraft(userId, workspaceId, p);
        profileRef.current = recovered ?? p;
        dirtyRef.current = Boolean(recovered);
        setProfileState(recovered ?? p);
      }
      setSources(s);
    }).catch((error) => {
      if (active) setLoadError(workspaceErrorMessage(error, "maroBrain nuk u ngarkua. Drafti yt është ruajtur; provo përsëri."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [userId, workspaceId, loadAttempt]);

  const persistDraft = React.useCallback((snapshot: WorkspaceBrainProfile, manual = false): Promise<void> => {
    if (!userId || !workspaceId) return Promise.resolve();
    if (inFlight.current?.profile === snapshot) return inFlight.current.task;
    if (mounted.current) { setSaving(true); setSaveError(null); }
    const task = saveBrainProfile(userId, workspaceId, snapshot).then(() => {
      clearSavedBrainDraft(userId, workspaceId, snapshot);
      if (profileRef.current === snapshot) dirtyRef.current = false;
      if (manual && mounted.current) toast("maroBrain u ruajt.");
    }).catch((error) => {
      const message = workspaceErrorMessage(error, "Ruajtja dështoi. Drafti yt është ruajtur; provo përsëri.");
      if (mounted.current) {
        setSaveError(message);
        if (manual) toast(message, "error");
      }
    }).finally(() => {
      if (inFlight.current?.task === task) {
        inFlight.current = null;
        if (mounted.current) setSaving(false);
      }
    });
    inFlight.current = { profile: snapshot, task };
    return task;
  }, [userId, workspaceId, toast]);

  React.useEffect(() => {
    if (loading || loadError || !dirtyRef.current) return;
    const timer = setTimeout(() => void persistDraft(profileRef.current), saveError ? 10_000 : 800);
    return () => clearTimeout(timer);
  }, [profile, loading, loadError, saveError, persistDraft]);

  React.useEffect(() => {
    mounted.current = true;
    const onOnline = () => { if (dirtyRef.current && canAutosave.current) void persistDraft(profileRef.current); };
    window.addEventListener("online", onOnline);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", onOnline);
      if (dirtyRef.current && canAutosave.current) void persistDraft(profileRef.current);
    };
  }, [persistDraft]);

  const onSave = () => persistDraft(profileRef.current, true);

  const onClear = () => {
    if (!confirm("Pastro të gjitha fushat e maroBrain për këtë workspace?")) return;
    setProfile(emptyBrainProfile());
  };

  if (!user) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-ink-2">
        Hyr për të konfiguruar maroBrain.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* Header */}
      <div className="shrink-0 bg-canvas px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="maro-text-h1 text-ink"><ProductLogo product="maroBrain" className="h-10 w-[180px]" /></h1>
            <div className="mt-4 max-w-md">
              <div className="h-2 overflow-hidden rounded-full bg-surface-selected">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: MARO_PRODUCTS.maroBrain.color }}
                />
              </div>
              <p className="mt-2 text-[14px] font-semibold text-ink-2">{progress}% e përfunduar</p>
              <p role="status" className="mt-1 text-[12px] text-ink-3">
                {saveError ?? (saving ? "Duke ruajtur automatikisht…" : "Ndryshimet ruhen automatikisht.")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="ghost"
              type="button"
              onClick={onClear}
              className="text-danger"
            >
              Pastroje
            </Button>
            <Button variant="brand" loading={saving}
              type="button"
              onClick={() => void onSave()}
              disabled={saving || loading || Boolean(loadError) || !workspaceId}
            >
              {saving ? "Duke ruajtur…" : "Ruaje"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:flex-row sm:px-8">
        {/* Sidebar */}
        <aside className="w-full shrink-0 sm:w-[220px]">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Workspace
          </label>
          <div className="relative mb-8">
            <select
              value={workspaceId ?? ""}
              onChange={(e) => void setActiveWorkspace(e.target.value).catch((error) =>
                toast(workspaceErrorMessage(error, "Workspace nuk u aktivizua. Provo përsëri."), "error")
              )}
              className="h-11 w-full appearance-none rounded-maro12 bg-surface-2 px-4 pr-9 text-[14px] font-semibold text-ink outline-none transition-colors hover:bg-surface-hover focus:bg-surface"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          </div>

          <nav className="flex flex-row gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
            {BRAIN_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-maro12 px-4 py-2.5 text-left text-[14px] font-semibold transition-colors sm:w-full",
                  tab === t.id ? "bg-surface text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main panel */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto scroll-thin rounded-maro16 bg-surface p-6 sm:p-8">
          {loadError && (
            <div role="alert" className="mb-4 text-sm text-danger">
              {loadError}
              <Button variant="ghost" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Provo përsëri</Button>
            </div>
          )}
          {loading ? (
            <p className="text-[14px] text-ink-3">Duke ngarkuar…</p>
          ) : tab === "brand" ? (
            <BrandTab profile={profile} setProfile={setProfile} workspaceId={workspaceId!} />
          ) : tab === "target" ? (
            <TargetTab profile={profile} setProfile={setProfile} />
          ) : tab === "goal" ? (
            <GoalTab profile={profile} setProfile={setProfile} />
          ) : tab === "market" ? (
            <MarketTab profile={profile} setProfile={setProfile} />
          ) : tab === "content" ? (
            <ContentTab profile={profile} setProfile={setProfile} />
          ) : (
            <SourcesTab
              userId={user.id}
              workspaceId={workspaceId!}
              sources={sources}
              onRefresh={refreshSources}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[18px] font-bold tracking-brand text-ink">{children}</h2>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="maro-text-label mb-2 block text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function inputCls() {
  return "maro-input h-[var(--maro-control-height-lg)] transition-colors duration-fast";
}

function textareaCls() {
  return "maro-input min-h-32 resize-y transition-colors duration-fast";
}

function BrandTab({
  profile,
  setProfile,
  workspaceId,
}: {
  profile: WorkspaceBrainProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>;
  workspaceId: string;
}) {
  const { toast } = useToast();
  const b = profile.brand;
  const setBrand = (patch: Partial<typeof b>) =>
    setProfile((p) => ({ ...p, brand: { ...p.brand, ...patch } }));

  return (
    <div className="space-y-8">
      <SectionTitle>Informatat</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emri">
          <input className={inputCls()} value={b.name} onChange={(e) => setBrand({ name: e.target.value })} placeholder="Cargomax Iveco" />
        </Field>
        <Field label="Kategoria">
          <select className={inputCls()} value={b.category} onChange={(e) => setBrand({ category: e.target.value })}>
            <option value="">Zgjidh…</option>
            {BRAIN_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Website">
          <input className={inputCls()} value={b.website} onChange={(e) => setBrand({ website: e.target.value })} placeholder="www.iveco.com" />
        </Field>
        <Field label="Phone">
          <div className="flex gap-2">
            <input className={cn(inputCls(), "w-24 shrink-0")} value={b.phoneCountry} onChange={(e) => setBrand({ phoneCountry: e.target.value })} />
            <input className={inputCls()} value={b.phone} onChange={(e) => setBrand({ phone: e.target.value })} placeholder="49585585" />
          </div>
        </Field>
      </div>
      <Field label="Pershkrimi">
        <textarea
          className={textareaCls()}
          value={b.description}
          onChange={(e) => setBrand({ description: e.target.value })}
          placeholder="Shitje dhe servisim te IVECO per kosove…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lokacioni">
          <input className={inputCls()} value={b.location} onChange={(e) => setBrand({ location: e.target.value })} />
        </Field>
        <Field label="Gjuha">
          <input className={inputCls()} value={b.language} onChange={(e) => setBrand({ language: e.target.value })} />
        </Field>
        <Field label="Modeli i Biznesit">
          <select className={inputCls()} value={b.businessModel} onChange={(e) => setBrand({ businessModel: e.target.value })}>
            <option value="">Zgjidh…</option>
            {BRAIN_BUSINESS_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Shitjet">
        <div className="flex flex-wrap gap-2">
          {SALES_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setBrand({ salesChannel: o.id })}
              className={cn(
                "rounded-maro12 px-4 py-2 text-sm font-bold tracking-wide",
                b.salesChannel === o.id
                  ? "bg-brand text-brand-fg"
                  : "bg-surface-2 text-ink-2 hover:bg-surface-hover"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <div>
        <SectionTitle>Logo</SectionTitle>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-20 min-w-[120px] items-center justify-center rounded-maro12 bg-surface-2 px-4">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt="" className="max-h-14 max-w-[160px] object-contain" />
            ) : (
              <span className="text-sm text-ink-3">Pa logo</span>
            )}
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-maro12 bg-surface-2 px-4 text-sm font-semibold text-ink hover:bg-surface-hover">
            <Upload className="h-4 w-4" />
            Ndrysho logo / Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !workspaceId) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const uploaded = await uploadSourceImage(String(reader.result ?? ""), workspaceId);
                  if (!uploaded) {
                    toast("Logo nuk u ngarkua. Provo përsëri.");
                    return;
                  }
                  setBrand({ logoUrl: uploaded.url, logoStorageRef: uploaded.storageRef });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      </div>

      <div>
        <SectionTitle>Kanalet</SectionTitle>
        <div className="mt-4 space-y-3">
          {b.channels.map((ch) => (
            <div key={ch.id} className="flex flex-wrap items-center gap-2">
              <select
                className={cn(inputCls(), "w-[140px]")}
                value={ch.platform}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    brand: {
                      ...p.brand,
                      channels: p.brand.channels.map((c) =>
                        c.id === ch.id ? { ...c, platform: e.target.value } : c
                      ),
                    },
                  }))
                }
              >
                {CHANNEL_PLATFORMS.map((pl) => (
                  <option key={pl} value={pl}>{pl}</option>
                ))}
              </select>
              <input
                className={cn(inputCls(), "min-w-[180px] flex-1")}
                value={ch.handle}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    brand: {
                      ...p.brand,
                      channels: p.brand.channels.map((c) =>
                        c.id === ch.id ? { ...c, handle: e.target.value } : c
                      ),
                    },
                  }))
                }
                placeholder="@handle"
              />
              <button
                type="button"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    brand: { ...p.brand, channels: p.brand.channels.filter((c) => c.id !== ch.id) },
                  }))
                }
                className="grid h-11 w-11 place-items-center rounded-xl text-ink-3 hover:bg-surface-2 hover:text-danger"
                aria-label="Hiq kanalin"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setBrand({
                channels: [
                  ...b.channels,
                  { id: uid("ch"), platform: "Instagram", handle: "" },
                ],
              })
            }
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-dashed border-line px-4 text-sm font-bold text-brand"
          >
            <Plus className="h-4 w-4" /> SHTO +
          </button>
        </div>
      </div>
    </div>
  );
}

function TargetTab({
  profile,
  setProfile,
}: {
  profile: WorkspaceBrainProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>;
}) {
  const t = profile.target;
  const set = (patch: Partial<typeof t>) =>
    setProfile((p) => ({ ...p, target: { ...p.target, ...patch } }));
  return (
    <div className="space-y-5">
      <SectionTitle>Targeti</SectionTitle>
      <p className="text-[14px] text-ink-2">Kush është klienti ideal dhe çfarë i intereson.</p>
      <Field label="Audienca">
        <textarea className={textareaCls()} value={t.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="Kompanitë transporti, flotat e ndërtimit…" />
      </Field>
      <Field label="Demografia / profili">
        <textarea className={textareaCls()} value={t.demographics} onChange={(e) => set({ demographics: e.target.value })} />
      </Field>
      <Field label="Interesat">
        <textarea className={textareaCls()} value={t.interests} onChange={(e) => set({ interests: e.target.value })} />
      </Field>
      <Field label="Pain points">
        <textarea className={textareaCls()} value={t.painPoints} onChange={(e) => set({ painPoints: e.target.value })} />
      </Field>
    </div>
  );
}

function GoalTab({
  profile,
  setProfile,
}: {
  profile: WorkspaceBrainProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>;
}) {
  const g = profile.goal;
  const set = (patch: Partial<typeof g>) =>
    setProfile((p) => ({ ...p, goal: { ...p.goal, ...patch } }));
  return (
    <div className="space-y-5">
      <SectionTitle>Goal</SectionTitle>
      <Field label="Qëllimi kryesor">
        <textarea className={textareaCls()} value={g.primaryGoal} onChange={(e) => set({ primaryGoal: e.target.value })} placeholder="Rrit awareness për shërbimet IVECO në Kosovë…" />
      </Field>
      <Field label="Qëllime sekondare">
        <textarea className={textareaCls()} value={g.secondaryGoals} onChange={(e) => set({ secondaryGoals: e.target.value })} />
      </Field>
      <Field label="Metrika suksesi">
        <textarea className={textareaCls()} value={g.successMetrics} onChange={(e) => set({ successMetrics: e.target.value })} />
      </Field>
    </div>
  );
}

function MarketTab({
  profile,
  setProfile,
}: {
  profile: WorkspaceBrainProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>;
}) {
  const m = profile.market;
  const set = (patch: Partial<typeof m>) =>
    setProfile((p) => ({ ...p, market: { ...p.market, ...patch } }));
  return (
    <div className="space-y-5">
      <SectionTitle>Market</SectionTitle>
      <Field label="Rajoni / tregu">
        <input className={inputCls()} value={m.region} onChange={(e) => set({ region: e.target.value })} placeholder="Kosovë, Ballkan…" />
      </Field>
      <Field label="Konkurrentët">
        <textarea className={textareaCls()} value={m.competitors} onChange={(e) => set({ competitors: e.target.value })} />
      </Field>
      <Field label="Pozicionimi">
        <textarea className={textareaCls()} value={m.positioning} onChange={(e) => set({ positioning: e.target.value })} />
      </Field>
      <Field label="Dalluesit">
        <textarea className={textareaCls()} value={m.differentiators} onChange={(e) => set({ differentiators: e.target.value })} placeholder="I vetmi autorizuar IVECO për Kosovë…" />
      </Field>
    </div>
  );
}

function ContentTab({
  profile,
  setProfile,
}: {
  profile: WorkspaceBrainProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceBrainProfile>>;
}) {
  const c = profile.content;
  const set = (patch: Partial<typeof c>) =>
    setProfile((p) => ({ ...p, content: { ...p.content, ...patch } }));
  return (
    <div className="space-y-5">
      <SectionTitle>Kontenti</SectionTitle>
      <Field label="Toni">
        <input className={inputCls()} value={c.tone} onChange={(e) => set({ tone: e.target.value })} placeholder="Profesional, i besueshëm…" />
      </Field>
      <Field label="Zëri i brandit">
        <input className={inputCls()} value={c.voice} onChange={(e) => set({ voice: e.target.value })} />
      </Field>
      <Field label="Temat e përmbajtjes">
        <textarea className={textareaCls()} value={c.themes} onChange={(e) => set({ themes: e.target.value })} />
      </Field>
      <Field label="Çfarë të shmangesh">
        <textarea className={textareaCls()} value={c.avoid} onChange={(e) => set({ avoid: e.target.value })} />
      </Field>
      <Field label="Hashtags default">
        <input className={inputCls()} value={c.hashtags} onChange={(e) => set({ hashtags: e.target.value })} placeholder="#iveco #kosove" />
      </Field>
    </div>
  );
}

function SourcesTab({
  userId,
  workspaceId,
  sources,
  onRefresh,
}: {
  userId: string;
  workspaceId: string;
  sources: WorkspaceSource[];
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [keywords, setKeywords] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const onAdd = async () => {
    if (!name.trim() || !keywords.trim() || !fileUrl) {
      toast("Plotëso emrin, keyword-et dhe ngarko një foto.");
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadSourceImage(fileUrl, workspaceId);
      if (!uploaded) throw new Error("upload-failed");
      await addWorkspaceSource({
        userId,
        workspaceId,
        name: name.trim(),
        keywords: keywords.trim(),
        fileUrl: uploaded.storageRef,
      });
      setName("");
      setKeywords("");
      setFileUrl(null);
      await onRefresh();
      toast("Burimi u shtua.");
    } catch (error) {
      toast(workspaceErrorMessage(error, "Burimi nuk u ruajt. Provo përsëri."), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Burimet</SectionTitle>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Ngarko foto/produkte dhe jepu keyword-e të ndara me presje. Kur shkruan prompt (p.sh.{" "}
          <span className="font-semibold text-ink">iveco daily</span>), platforma i gjen automatikisht
          referencat.
        </p>
      </div>

      <div className="rounded-maro12 bg-surface-2 p-4 space-y-4">
        <Field label="Emri i burimit">
          <input className={inputCls()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Iveco Daily" />
        </Field>
        <Field label="Keywords (ndaji me presje)">
          <input
            className={inputCls()}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="iveco daily, daily, furgon"
          />
        </Field>
        <Field label="Foto">
          <div className="flex flex-wrap items-center gap-3">
            {fileUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt="" className="h-20 w-20 rounded-maro8 object-cover" />
            )}
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-maro12 bg-surface px-4 text-sm font-semibold hover:bg-surface-hover">
              <Upload className="h-4 w-4" /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setFileUrl(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
        </Field>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onAdd()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-fg disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Shto burim
        </button>
      </div>

      <div className="space-y-3">
        {sources.length === 0 ? (
          <p className="text-sm text-ink-3">Asnjë burim ende.</p>
        ) : (
          sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-maro12 bg-surface-2 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.fileUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">{s.name}</div>
                <div className="truncate text-[12px] text-ink-3">{s.keywords}</div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteWorkspaceSource(userId, workspaceId, s.id);
                    await onRefresh();
                    toast("Burimi u fshi.");
                  } catch (error) {
                    toast(workspaceErrorMessage(error, "Burimi nuk u fshi. Provo përsëri."), "error");
                  }
                }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-danger"
                aria-label="Fshi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
