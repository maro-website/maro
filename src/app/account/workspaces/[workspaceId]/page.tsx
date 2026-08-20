"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppShell } from "@/components/app/AppShell";
import { AvatarCropper } from "@/components/app/AvatarCropper";
import { useToast } from "@/components/ui/Toast";
import { useWorkspace } from "@/context/workspace";
import { DEFAULT_WORKSPACE_BRAND, type WorkspaceBrand } from "@/lib/workspaces/types";
import { normalizeWorkspaceBrand } from "@/lib/workspaces/brand";
import { Check, Trash2 } from "lucide-react";

function WorkspaceSettingsInner() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const workspaceId = params.workspaceId as string;
  const { workspaces, updateWorkspace, deleteWorkspace, setActiveWorkspace } = useWorkspace();
  const ws = workspaces.find((w) => w.id === workspaceId);

  const [name, setName] = React.useState(ws?.name ?? "");
  const [brand, setBrand] = React.useState<WorkspaceBrand>(
    normalizeWorkspaceBrand(ws?.brand ?? DEFAULT_WORKSPACE_BRAND)
  );
  const [saving, setSaving] = React.useState(false);
  const [savingBrand, setSavingBrand] = React.useState(false);
  const [uploadingIcon, setUploadingIcon] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [logoCropSrc, setLogoCropSrc] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const logoRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ws) {
      setName(ws.name);
      setBrand(normalizeWorkspaceBrand(ws.brand ?? DEFAULT_WORKSPACE_BRAND));
    }
  }, [ws]);

  if (!ws) {
    return (
      <AppShell showFooter>
        <div className="px-5 py-10 text-ink-2">Workspace nuk u gjet.</div>
      </AppShell>
    );
  }

  const saveName = async () => {
    setSaving(true);
    await updateWorkspace(workspaceId, { name: name.trim() || ws.name });
    setSaving(false);
    toast("Emri u ruajt.");
  };

  const saveIcon = async (dataUrl: string) => {
    setUploadingIcon(true);
    try {
      await updateWorkspace(workspaceId, { iconUrl: dataUrl });
      setCropSrc(null);
      toast("Ikona u ndryshua.");
    } finally {
      setUploadingIcon(false);
    }
  };

  const saveBrand = async () => {
    setSavingBrand(true);
    await updateWorkspace(workspaceId, { brand });
    setSavingBrand(false);
    toast("Brand u ruajt.");
  };

  const saveLogo = async (dataUrl: string) => {
    setUploadingLogo(true);
    try {
      const next = { ...brand, logoUrl: dataUrl };
      setBrand(next);
      await updateWorkspace(workspaceId, { brand: next });
      setLogoCropSrc(null);
      toast("Logo u vendos.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Fshi këtë workspace? Ky veprim nuk kthehet mbrapsht.")) return;
    const ok = await deleteWorkspace(workspaceId);
    if (ok) {
      toast("Workspace u fshi.");
      router.push("/account/workspaces");
    } else {
      toast("Duhet të kesh të paktën një workspace.");
    }
  };

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-lg px-5 py-10 sm:px-8">
        <h1 className="text-[24px] font-bold tracking-brand text-ink">Cilesimet e workspace</h1>

        <div className="mt-8 flex flex-col gap-6">
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-ink-2">Ikona</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative overflow-hidden rounded-maro12 bg-surface-2"
              >
                {ws.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ws.iconUrl} alt="" className="h-16 w-16 object-cover" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center bg-brand-soft text-[20px] font-bold text-brand">
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setCropSrc(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              <p className="text-[13px] text-ink-3">PNG ose JPG, max 2MB.</p>
            </div>
          </div>

          <div>
            <label htmlFor="ws-name" className="mb-2 block text-[13px] font-semibold text-ink-2">
              Emri
            </label>
            <div className="flex gap-2">
              <input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 flex-1 rounded-maro12 bg-surface-2 px-4 text-[15px] text-ink outline-none transition-colors hover:bg-surface-hover focus:bg-surface"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={saving || !name.trim()}
                className="inline-flex h-12 items-center gap-1.5 rounded-xl bg-ink px-4 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Ruaj
              </button>
            </div>
          </div>

          <div className="border-t border-subtle pt-8">
            <h2 className="text-[16px] font-bold tracking-brand text-ink">Brand i workspace</h2>
            <p className="mt-1 text-[13px] text-ink-3">
              Përdoret automatikisht në maro Brand dhe maro Imazh kur aktivizohet.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-ink-2">Logo</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    className="relative overflow-hidden rounded-maro12 bg-surface-2"
                  >
                    {brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={brand.logoUrl} alt="" className="h-16 w-16 object-contain p-1" />
                    ) : (
                      <span className="grid h-16 w-16 place-items-center text-[12px] font-semibold text-ink-3">
                        Logo
                      </span>
                    )}
                  </button>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setLogoCropSrc(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  {brand.logoUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        const next = { ...brand, logoUrl: null };
                        setBrand(next);
                        await updateWorkspace(workspaceId, { brand: next });
                        toast("Logo u hoq.");
                      }}
                      className="text-[13px] font-semibold text-ink-3 hover:text-ink"
                    >
                      Hiq logo
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="brand-name" className="mb-2 block text-[13px] font-semibold text-ink-2">
                  Emri i brandit
                </label>
                <input
                  id="brand-name"
                  value={brand.name ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))}
                  placeholder="p.sh. Kafe Luna"
                  className="h-12 w-full rounded-maro12 bg-surface-2 px-4 text-[15px] text-ink outline-none transition-colors hover:bg-surface-hover focus:bg-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["primaryColor", "Ngjyra kryesore"],
                    ["secondaryColor", "Ngjyra dytësore"],
                    ["backgroundColor", "Sfondi"],
                    ["textColor", "Teksti"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-2 block text-[13px] font-semibold text-ink-2">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand[key]}
                        onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
                        className="h-10 w-10 cursor-pointer rounded-maro8 bg-surface-2 p-0.5"
                        aria-label={label}
                      />
                      <input
                        value={brand[key]}
                        onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
                        className="h-10 min-w-0 flex-1 rounded-maro12 bg-surface-2 px-3 font-mono text-[13px] text-ink outline-none transition-colors hover:bg-surface-hover focus:bg-surface"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={saveBrand}
                disabled={savingBrand}
                className="inline-flex h-11 items-center gap-1.5 self-start rounded-xl bg-ink px-4 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Ruaj brandin
              </button>
            </div>
          </div>

          <div className="border-t border-subtle pt-8">
            <button
              type="button"
              onClick={async () => {
                await setActiveWorkspace(workspaceId);
                toast("Workspace u aktivizua.");
              }}
              className="mb-4 text-[14px] font-semibold text-brand hover:underline"
            >
              Bëje aktiv
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-danger/30 px-4 py-2.5 text-[14px] font-semibold text-danger transition-colors hover:bg-danger/5"
            >
              <Trash2 className="h-4 w-4" />
              Fshi workspace
            </button>
          </div>
        </div>
      </div>

      <AvatarCropper
        src={cropSrc}
        open={cropSrc !== null}
        saving={uploadingIcon}
        onCancel={() => setCropSrc(null)}
        onConfirm={saveIcon}
      />
      <AvatarCropper
        src={logoCropSrc}
        open={logoCropSrc !== null}
        saving={uploadingLogo}
        onCancel={() => setLogoCropSrc(null)}
        onConfirm={saveLogo}
      />
    </AppShell>
  );
}

export default function WorkspaceSettingsPage() {
  return (
    <AuthGate>
      <WorkspaceSettingsInner />
    </AuthGate>
  );
}
