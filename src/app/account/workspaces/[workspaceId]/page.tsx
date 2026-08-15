"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppShell } from "@/components/app/AppShell";
import { AvatarCropper } from "@/components/app/AvatarCropper";
import { useToast } from "@/components/ui/Toast";
import { useWorkspace } from "@/context/workspace";
import { Check, Trash2 } from "lucide-react";

function WorkspaceSettingsInner() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const workspaceId = params.workspaceId as string;
  const { workspaces, updateWorkspace, deleteWorkspace, setActiveWorkspace } = useWorkspace();
  const ws = workspaces.find((w) => w.id === workspaceId);

  const [name, setName] = React.useState(ws?.name ?? "");
  const [saving, setSaving] = React.useState(false);
  const [uploadingIcon, setUploadingIcon] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ws) setName(ws.name);
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
                className="relative overflow-hidden rounded-xl border border-line"
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
                className="h-12 flex-1 rounded-xl border border-line bg-canvas px-4 text-[15px] text-ink outline-none focus:border-brand"
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

          <div className="border-t border-line pt-6">
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
