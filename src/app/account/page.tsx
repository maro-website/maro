"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { AvatarCropper } from "@/components/app/AvatarCropper";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { initials } from "@/lib/utils/format";
import { Coins, Pencil, Check, X, Plus, Camera } from "lucide-react";

function AccountInner() {
  const router = useRouter();
  const { user, credits, updateProfileName, updateAvatar } = useMaro();
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Zgjidh një imazh.");
    if (file.size > 6 * 1024 * 1024) return toast("Imazhi është shumë i madh (max 6MB).");
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveCrop = async (dataUrl: string) => {
    setUploading(true);
    const { error } = await updateAvatar(dataUrl);
    setUploading(false);
    setCropSrc(null);
    toast(error ? "Gabim gjatë ngarkimit." : "Fotoja u ndryshua.");
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink">Llogaria</h1>

        <div className="mt-6 grid gap-5 md:grid-cols-[1.5fr_1fr]">
          {/* Profile with inline editing */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="group relative h-16 w-16 shrink-0"
                title="Ndrysho foton"
              >
                {user?.avatarUrl ? (
                  <span className="block h-16 w-16 overflow-hidden rounded-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span
                    className="grid h-16 w-16 place-items-center rounded-full text-[20px] font-bold text-white"
                    style={{ background: user?.avatarColor }}
                  >
                    {initials(user?.name ?? "U")}
                  </span>
                )}
                <span className="absolute inset-0 grid place-items-center rounded-full bg-ink/45 opacity-0 transition-opacity group-hover:opacity-100">
                  {uploading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickAvatar(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="min-w-0">
                <div className="text-[18px] font-bold text-ink">{user?.name}</div>
                <Badge tone="neutral" className="mt-1 capitalize">
                  Plani {user?.plan}
                </Badge>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <EditableField
                label="Emri"
                value={user?.name ?? ""}
                onSave={async (v) => {
                  const { error } = await updateProfileName(v);
                  if (error) toast(`Gabim: ${error}`);
                  else toast("Emri u ruajt.");
                  return !error;
                }}
              />
              <EditableField
                label="Email"
                value={user?.email ?? ""}
                type="email"
                onSave={async (v) => {
                  const { error } = await getSupabaseBrowser().auth.updateUser({ email: v.trim() });
                  if (error) {
                    toast(`Gabim: ${error.message}`);
                    return false;
                  }
                  toast("Të dërguam një email konfirmimi.");
                  return true;
                }}
              />
            </div>
          </div>

          {/* Credits aside */}
          <div className="flex flex-col rounded-2xl border border-line bg-surface p-6">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
              <Coins className="h-4 w-4 text-brand" /> Maro Credits
            </span>
            <div className="mt-2 text-[40px] font-extrabold leading-none tracking-tight text-ink">
              {credits}
            </div>
            <div className="text-[12.5px] text-ink-3">kredite të disponueshme</div>
            <button
              onClick={() => router.push("/credits")}
              className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" /> Shto
            </button>
          </div>
        </div>
      </main>

      <AvatarCropper
        src={cropSrc}
        open={cropSrc !== null}
        saving={uploading}
        onCancel={() => setCropSrc(null)}
        onConfirm={saveCrop}
      />
    </div>
  );
}

function EditableField({
  label,
  value,
  type = "text",
  onSave,
}: {
  label: string;
  value: string;
  type?: string;
  onSave: (v: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const save = async () => {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{label}</div>
      {editing ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand bg-surface px-3 py-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
          />
          <button
            onClick={save}
            disabled={saving}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand hover:bg-brand-soft disabled:opacity-50"
            aria-label="Ruaj"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/40 border-t-brand" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2"
            aria-label="Anulo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <span className="truncate text-[15px] text-ink">{value || "Shto…"}</span>
          <button
            onClick={() => setEditing(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-line hover:text-ink"
            aria-label={`Ndrysho ${label}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGate>
      <AccountInner />
    </AuthGate>
  );
}
