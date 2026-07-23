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
import { Switch } from "@/components/ui/Switch";
import { initials } from "@/lib/utils/format";
import { Coins, Pencil, Check, X, Plus, Camera, Lock, ShieldCheck, Phone, Bell, Globe, Trash2 } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+383", label: "Kosovë (+383)" },
  { code: "+355", label: "Shqipëri (+355)" },
  { code: "+389", label: "Maqedoni (+389)" },
  { code: "+41", label: "Zvicër (+41)" },
  { code: "+49", label: "Gjermani (+49)" },
  { code: "+44", label: "MB (+44)" },
  { code: "+1", label: "SHBA (+1)" },
];

function AccountInner() {
  const router = useRouter();
  const { user, credits, projects, creations, session, updateProfileName, updateAvatar } = useMaro();
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const memberSince = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString("sq-AL", { month: "long", year: "numeric" })
    : null;

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
        <h1 className="text-[30px] font-light tracking-[-0.02em] text-ink">Llogaria</h1>

        {/* Hero: avatar + identity + stat chips, with a soft brand wash */}
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-soft blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 right-16 h-24 w-24 rotate-12 rounded-2xl" style={{ background: "color-mix(in srgb, var(--c-teal) 22%, transparent)" }} />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative h-20 w-20 shrink-0"
              title="Ndrysho foton"
            >
              {user?.avatarUrl ? (
                <span className="block h-20 w-20 overflow-hidden rounded-full ring-2 ring-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <span
                  className="grid h-20 w-20 place-items-center rounded-full text-[24px] font-bold text-white"
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
            <div className="min-w-0 flex-1">
              <div className="text-[22px] font-bold tracking-[-0.01em] text-ink">{user?.name}</div>
              <div className="truncate text-[13.5px] text-ink-3">{user?.email}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand" className="capitalize">Plani {user?.plan || "free"}</Badge>
                {memberSince && (
                  <span className="text-[12.5px] text-ink-3">Anëtar që nga {memberSince}</span>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-3">
            <StatChip label="Website" value={projects.length} />
            <StatChip label="Imazhe" value={creations.length} />
            <StatChip label="Kredite" value={credits} accent />
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[1.5fr_1fr]">
          {/* Profile with inline editing */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="text-[14px] font-bold text-ink">Profili</div>
            <div className="mt-4 flex flex-col gap-4">
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
          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
              <Coins className="h-4 w-4 text-brand" /> maro Credits
            </span>
            <div className="mt-2 text-[40px] font-extrabold leading-none tracking-tight text-ink">
              {credits}
            </div>
            <div className="text-[12.5px] text-ink-3">kredite të disponueshme</div>
            <button
              onClick={() => router.push("/credits")}
              className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" /> Shto
            </button>
          </div>
        </div>

        <PreferencesSection />
        <SecuritySection />
        <DangerZone />
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

function StatChip({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center">
      <div className={`text-[22px] font-extrabold leading-none tracking-tight ${accent ? "text-brand" : "text-ink"}`}>
        {value}
      </div>
      <div className="mt-1 text-[12px] text-ink-3">{label}</div>
    </div>
  );
}

// ---- Preferences: notifications + language ----
function PreferencesSection() {
  const { session } = useMaro();
  const { toast } = useToast();
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;

  const [emailNews, setEmailNews] = React.useState<boolean>(meta.email_news !== false);
  const [productTips, setProductTips] = React.useState<boolean>(Boolean(meta.product_tips));
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await getSupabaseBrowser().auth.updateUser({
      data: { email_news: emailNews, product_tips: productTips, ui_lang: "sq" },
    });
    setSaving(false);
    toast(error ? `Gabim: ${error.message}` : "Preferencat u ruajtën.");
  };

  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
      <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
        <Bell className="h-4 w-4 text-ink-2" /> Preferencat
      </div>
      <div className="mt-4 flex flex-col divide-y divide-line">
        <ToggleRow
          label="Email me lajme & oferta"
          hint="Merr njoftime kur dalin tool-e ose oferta të reja."
          on={emailNews}
          onToggle={() => setEmailNews((v) => !v)}
        />
        <ToggleRow
          label="Këshilla për produktin"
          hint="Truqe të shkurtra për të nxjerrë maksimumin nga maro."
          on={productTips}
          onToggle={() => setProductTips((v) => !v)}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-2">
          <Globe className="h-4 w-4 text-ink-3" /> Gjuha e platformës
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-[14px] font-medium text-ink">
          Shqip
        </span>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
      >
        {saving ? "Duke ruajtur…" : "Ruaj preferencat"}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-ink">{label}</div>
        <div className="text-[12.5px] text-ink-3">{hint}</div>
      </div>
      <Switch checked={on} onChange={onToggle} aria-label={label} />
    </div>
  );
}

// ---- Danger zone ----
function DangerZone() {
  const { toast } = useToast();
  return (
    <div className="mt-5 rounded-2xl border border-danger/30 bg-danger/5 p-6">
      <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
        <Trash2 className="h-4 w-4 text-danger" /> Zona e rrezikut
      </div>
      <p className="mt-1 text-[13px] text-ink-2">
        Fshirja e llogarisë është e përhershme dhe heq të gjitha të dhënat.
      </p>
      <button
        onClick={() => toast("Për të fshirë llogarinë, na shkruaj te erzen@nice.al.")}
        className="mt-3 rounded-xl border border-danger/40 bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        Fshi llogarinë
      </button>
    </div>
  );
}

// ---- Security: phone, password, 2FA ----
function SecuritySection() {
  const { session } = useMaro();
  const { toast } = useToast();
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;

  // Phone (required)
  const savedPhone = (meta.phone as string) || "";
  const savedPrefix = COUNTRY_CODES.find((c) => savedPhone.startsWith(c.code))?.code ?? "+383";
  const [prefix, setPrefix] = React.useState(savedPrefix);
  const [phone, setPhone] = React.useState(savedPhone.replace(savedPrefix, ""));
  const [savingPhone, setSavingPhone] = React.useState(false);

  const savePhone = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) return toast("Shkruaj një numër të vlefshëm.");
    setSavingPhone(true);
    const { error } = await getSupabaseBrowser().auth.updateUser({
      data: { phone: `${prefix}${digits}` },
    });
    setSavingPhone(false);
    toast(error ? `Gabim: ${error.message}` : "Numri u ruajt.");
  };

  // Password
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [savingPw, setSavingPw] = React.useState(false);

  const savePassword = async () => {
    if (pw.length < 8) return toast("Fjalëkalimi duhet të ketë të paktën 8 karaktere.");
    if (pw !== pw2) return toast("Fjalëkalimet nuk përputhen.");
    setSavingPw(true);
    const { error } = await getSupabaseBrowser().auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) return toast(`Gabim: ${error.message}`);
    setPw("");
    setPw2("");
    toast("Fjalëkalimi u ndryshua.");
  };

  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      {/* Phone */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
          <Phone className="h-4 w-4 text-ink-2" /> Numri i telefonit *
        </div>
        <div className="mt-4 flex gap-2">
          <select
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="h-11 shrink-0 rounded-xl border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="44 123 456"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <button
          onClick={savePhone}
          disabled={savingPhone}
          className="mt-3 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
        >
          {savingPhone ? "Duke ruajtur…" : "Ruaj numrin"}
        </button>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
          <Lock className="h-4 w-4 text-ink-2" /> Ndrysho fjalëkalimin
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Fjalëkalimi i ri"
            className="h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Konfirmo fjalëkalimin"
            className="h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <button
          onClick={savePassword}
          disabled={savingPw}
          className="mt-3 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
        >
          {savingPw ? "Duke ruajtur…" : "Ruaj fjalëkalimin"}
        </button>
      </div>

      {/* 2FA */}
      <div className="rounded-2xl border border-line bg-surface p-6 md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <ShieldCheck className="h-4 w-4 text-ink-2" /> Verifikimi me dy hapa (2FA)
            </div>
            <p className="mt-1 text-[13px] text-ink-2">
              Shto një shtresë sigurie me Google Authenticator. Integrimi aktivizohet së shpejti.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 cursor-not-allowed rounded-xl border border-line-strong bg-surface-2 px-4 py-2.5 text-[13.5px] font-semibold text-ink-3"
          >
            Së shpejti
          </button>
        </div>
      </div>
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
