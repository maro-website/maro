"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import {
  DEFAULT_PRICING,
  creditCost,
  type PricingConfig,
  type Profile,
  type GenerationLog,
  type WebsiteKind,
  type SpeedKey,
  type Announcement,
} from "@/lib/supabase/types";
import { TOOLS } from "@/lib/tools/registry";
import { timeAgo } from "@/lib/utils/format";
import {
  Users,
  FileText,
  Coins,
  ScrollText,
  Save,
  Shield,
  Wand2,
  LayoutDashboard,
  Megaphone,
  ShoppingCart,
  UploadCloud,
  Trash2,
  BarChart3,
  Eye,
  Copy,
  Ticket,
  Star,
  Plus,
  Check,
  X,
  Flag,
  ChevronDown,
  RotateCcw,
  Archive,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

type Tab =
  | "overview"
  | "users"
  | "creators"
  | "promos"
  | "prompt"
  | "reports"
  | "reklamat"
  | "pricing"
  | "analytics"
  | "orders"
  | "log";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Përdoruesit", icon: Users },
  { key: "creators", label: "Kreatorët", icon: Star },
  { key: "promos", label: "Promo Kode", icon: Ticket },
  { key: "prompt", label: "Master Prompts", icon: FileText },
  { key: "reports", label: "Raporto", icon: Flag },
  { key: "reklamat", label: "Njoftimet", icon: Megaphone },
  { key: "pricing", label: "Çmimet", icon: Coins },
  { key: "analytics", label: "Analitika", icon: BarChart3 },
  { key: "orders", label: "Porositë", icon: ShoppingCart },
  { key: "log", label: "Log", icon: ScrollText },
];

export default function AdminPage() {
  const router = useRouter();
  const { ready, user, isAdmin } = useMaro();

  React.useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/sign-in");
    else if (!isAdmin) router.replace("/");
  }, [ready, user, isAdmin, router]);

  if (!ready || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return <AdminInner />;
}

function AdminInner() {
  const [tab, setTab] = React.useState<Tab>("overview");
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-ink-inv">
            <Shield className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] text-ink">Admin</h1>
            <p className="text-[14px] text-ink-2">Menaxho përdoruesit, kreditet, promptet, reklamat dhe çmimet.</p>
          </div>
        </div>

        {!supabaseConfigured && (
          <div className="mt-6 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
            Supabase nuk është konfiguruar. Shto çelësat te .env.local për të aktivizuar panelin.
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Vertical nav */}
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-[14px] font-semibold transition-colors lg:w-full ${
                  tab === t.key ? "bg-ink text-ink-inv" : "text-ink-2 hover:bg-surface-2"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0">
            {tab === "overview" && <OverviewTab />}
            {tab === "users" && <UsersTab />}
            {tab === "creators" && <CreatorsTab />}
            {tab === "promos" && <PromosTab />}
            {tab === "prompt" && <MasterPromptsTab />}
            {tab === "reports" && <ReportsTab />}
            {tab === "reklamat" && <ReklamatTab />}
            {tab === "pricing" && <PricingTab />}
            {tab === "analytics" && <AnalyticsTab />}
            {tab === "orders" && <OrdersTab />}
            {tab === "log" && <LogTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

// ---- Overview / Dashboard ----
function OverviewTab() {
  const [stats, setStats] = React.useState<{
    users: number;
    admins: number;
    credits: number;
    gens: number;
    images: number;
    websites: number;
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return;
      const sb = getSupabaseBrowser();
      const [{ data: profiles }, { data: gens }] = await Promise.all([
        sb.from("profiles").select("credits, is_admin"),
        sb.from("generations").select("kind").limit(5000),
      ]);
      const rows = (profiles as { credits: number; is_admin: boolean }[]) ?? [];
      const g = (gens as { kind: string | null }[]) ?? [];
      setStats({
        users: rows.length,
        admins: rows.filter((r) => r.is_admin).length,
        credits: rows.reduce((a, r) => a + (r.credits ?? 0), 0),
        gens: g.length,
        images: g.filter((x) => x.kind === "image").length,
        websites: g.filter((x) => x.kind !== "image").length,
      });
    })();
  }, []);

  if (!stats) return <Spinner className="h-6 w-6" />;

  const cards = [
    { label: "Përdorues", value: stats.users, icon: Users },
    { label: "Adminë", value: stats.admins, icon: Shield },
    { label: "Kredite në qarkullim", value: stats.credits, icon: Coins },
    { label: "Gjenerime gjithsej", value: stats.gens, icon: Wand2 },
    { label: "Imazhe", value: stats.images, icon: Megaphone },
    { label: "Website", value: stats.websites, icon: FileText },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ink-3">
            <c.icon className="h-4 w-4" /> {c.label}
          </div>
          <div className="mt-2 text-[30px] font-extrabold tracking-[-0.03em] text-ink">
            {c.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Users ----
function UsersTab() {
  const { toast } = useToast();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!supabaseConfigured) return setLoading(false);
    setLoading(true);
    const { data } = await getSupabaseBrowser()
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  const toggleCreator = async (p: Profile) => {
    const next = !p.is_creator;
    const { error } = await getSupabaseBrowser()
      .from("profiles")
      .update({ is_creator: next })
      .eq("id", p.id);
    if (error) {
      toast("Gabim: " + error.message);
      return;
    }
    toast(next ? "U bë Kreator" : "U hoq nga Kreatorët");
    void load();
  };

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveCredits = async (p: Profile) => {
    const raw = edits[p.id];
    const value = raw === undefined ? p.credits : parseInt(raw, 10);
    if (Number.isNaN(value) || value < 0) {
      toast("Vlerë e pavlefshme");
      return;
    }
    setSavingId(p.id);
    const { error } = await getSupabaseBrowser()
      .from("profiles")
      .update({ credits: value })
      .eq("id", p.id);
    setSavingId(null);
    if (error) {
      toast("Gabim: " + error.message);
      return;
    }
    toast(`Kreditet u caktuan: ${value}`);
    setEdits((e) => {
      const n = { ...e };
      delete n[p.id];
      return n;
    });
    void load();
  };

  const filtered = profiles.filter(
    (p) =>
      !query ||
      p.email?.toLowerCase().includes(query.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <div>
      <Input
        placeholder="Kërko përdorues me email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 max-w-sm"
      />
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-surface-2 text-[12px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Përdoruesi</th>
              <th className="px-4 py-2.5 font-semibold">Kreator</th>
              <th className="px-4 py-2.5 font-semibold">Kredite</th>
              <th className="px-4 py-2.5 font-semibold">Cakto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((p) => (
              <tr key={p.id} className="bg-surface">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium text-ink">
                    {p.full_name || p.email?.split("@")[0]}
                    {p.is_admin && <Badge tone="brand" className="text-[10px]">admin</Badge>}
                  </div>
                  <div className="text-[12px] text-ink-3">{p.email}</div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleCreator(p)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                      p.is_creator
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-line-strong text-ink-3 hover:bg-surface-2"
                    }`}
                    title={p.is_creator ? "Hiq nga Kreatorët" : "Bëje Kreator"}
                  >
                    <Star className={`h-3.5 w-3.5 ${p.is_creator ? "fill-brand" : ""}`} />
                    {p.is_creator ? "Kreator" : "Bëje"}
                  </button>
                </td>
                <td className="px-4 py-3 font-bold text-ink">{p.credits}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={edits[p.id] ?? String(p.credits)}
                      onChange={(e) => setEdits((x) => ({ ...x, [p.id]: e.target.value }))}
                      className="h-9 w-24"
                    />
                    <div className="hidden gap-1 sm:flex">
                      {[50, 100, 500].map((n) => (
                        <button
                          key={n}
                          onClick={() =>
                            setEdits((x) => ({
                              ...x,
                              [p.id]: String((parseInt(x[p.id] ?? String(p.credits), 10) || 0) + n),
                            }))
                          }
                          className="rounded-lg border border-line-strong px-2 py-1 text-[12px] font-semibold text-ink-2 hover:bg-surface-2"
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      loading={savingId === p.id}
                      onClick={() => saveCredits(p)}
                    >
                      Ruaj
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-3">
                  Asnjë përdorues.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Promo codes ----
interface PromoRow {
  id: string;
  code: string;
  slug: string | null;
  discount_percent: number;
  active: boolean;
  creator_id: string | null;
  created_at: string;
}

function PromosTab() {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<PromoRow[] | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [creators, setCreators] = React.useState<Profile[]>([]);
  const [draft, setDraft] = React.useState({ code: "", slug: "", discount: 10, creator_id: "" });
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!supabaseConfigured) return setRows([]);
    const sb = getSupabaseBrowser();
    const { data, error } = await sb
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMissing(true);
      setRows([]);
      return;
    }
    setRows((data as PromoRow[]) ?? []);
    const { data: profs } = await sb.from("profiles").select("*").eq("is_creator", true);
    setCreators((profs as Profile[]) ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const emailFor = (id: string | null) =>
    id ? creators.find((c) => c.id === id)?.email ?? "" : "";

  const add = async () => {
    const code = draft.code.trim().toUpperCase();
    if (!code) return toast("Shkruaj një kod.");
    setAdding(true);
    const { error } = await getSupabaseBrowser().from("promo_codes").insert({
      code,
      slug: draft.slug.trim() || null,
      discount_percent: draft.discount,
      creator_id: draft.creator_id || null,
      active: true,
    });
    setAdding(false);
    if (error) return toast("Gabim: " + error.message);
    toast("Kodi u shtua");
    setDraft({ code: "", slug: "", discount: 10, creator_id: "" });
    void load();
  };

  const update = async (id: string, patch: Partial<PromoRow>) => {
    const { error } = await getSupabaseBrowser().from("promo_codes").update(patch).eq("id", id);
    if (error) return toast("Gabim: " + error.message);
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await getSupabaseBrowser().from("promo_codes").delete().eq("id", id);
    if (error) return toast("Gabim: " + error.message);
    toast("Kodi u fshi");
    void load();
  };

  if (rows === null) return <Spinner className="h-6 w-6" />;

  if (missing) {
    return (
      <div className="rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
        Tabela <code>promo_codes</code> nuk ekziston ende. Ekzekuto migrimin
        0006_creators_promos.sql në Supabase për të aktivizuar promo kodet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New code */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="text-[14px] font-bold text-ink">Shto kod të ri</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Kodi i shitjes">
            <Input
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              className="uppercase"
            />
          </Field>
          <Field label="Slug linku (maro.al/r/…)">
            <Input
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="kreatori"
            />
          </Field>
          <Field label="Zbritje %">
            <Input
              type="number"
              value={draft.discount}
              onChange={(e) => setDraft((d) => ({ ...d, discount: parseInt(e.target.value, 10) || 0 }))}
            />
          </Field>
          <Field label="Kreator (opsional)">
            <select
              value={draft.creator_id}
              onChange={(e) => setDraft((d) => ({ ...d, creator_id: e.target.value }))}
              className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-[13.5px] text-ink outline-none"
            >
              <option value="">— asnjë —</option>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button className="mt-3" icon={<Plus className="h-4 w-4" />} loading={adding} onClick={add}>
          Shto kod
        </Button>
      </div>

      {/* Existing codes */}
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-surface-2 text-[12px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Kodi</th>
              <th className="px-4 py-2.5 font-semibold">Slug</th>
              <th className="px-4 py-2.5 font-semibold">Zbritje</th>
              <th className="px-4 py-2.5 font-semibold">Kreator</th>
              <th className="px-4 py-2.5 font-semibold">Aktiv</th>
              <th className="px-4 py-2.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="bg-surface">
                <td className="px-4 py-3 font-bold text-ink">{r.code}</td>
                <td className="px-4 py-3 text-ink-2">{r.slug || ""}</td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    value={r.discount_percent}
                    onChange={(e) =>
                      void update(r.id, { discount_percent: parseInt(e.target.value, 10) || 0 })
                    }
                    className="h-9 w-20"
                  />
                </td>
                <td className="px-4 py-3 text-ink-2">{emailFor(r.creator_id)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => void update(r.id, { active: !r.active })}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${
                      r.active
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-line-strong text-ink-3"
                    }`}
                  >
                    {r.active ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {r.active ? "Aktiv" : "Joaktiv"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void remove(r.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                    aria-label="Fshi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
                  Ende s&apos;ka promo kode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Creators (applications + active creators) ----
interface CreatorApp {
  id: string;
  name: string;
  email: string;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  website: string | null;
  status: string;
  created_at: string;
}

function CreatorsTab() {
  const { toast } = useToast();
  const [apps, setApps] = React.useState<CreatorApp[] | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [creators, setCreators] = React.useState<Profile[]>([]);

  const load = React.useCallback(async () => {
    if (!supabaseConfigured) return setApps([]);
    const sb = getSupabaseBrowser();
    const { data, error } = await sb
      .from("creator_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMissing(true);
      setApps([]);
      return;
    }
    setApps((data as CreatorApp[]) ?? []);
    const { data: profs } = await sb.from("profiles").select("*").eq("is_creator", true);
    setCreators((profs as Profile[]) ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const reject = async (id: string) => {
    const { error } = await getSupabaseBrowser()
      .from("creator_applications")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) return toast("Gabim: " + error.message);
    toast("U refuzua");
    void load();
  };

  // Approving must actually make the person a creator + give them a promo code,
  // otherwise "nothing happens". Do all three steps here.
  const approve = async (a: CreatorApp) => {
    const sb = getSupabaseBrowser();
    const { error: e1 } = await sb
      .from("creator_applications")
      .update({ status: "approved" })
      .eq("id", a.id);
    if (e1) return toast("Gabim: " + e1.message);

    const { data: prof } = await sb
      .from("profiles")
      .select("id")
      .ilike("email", a.email)
      .maybeSingle();
    if (!prof?.id) {
      toast("U aprovua, por s'u gjet përdoruesi me këtë email. Kërko t'i regjistrohet me këtë email.");
      void load();
      return;
    }
    await sb.from("profiles").update({ is_creator: true }).eq("id", prof.id);

    // Auto-create a promo code if the creator doesn't have one yet.
    const { data: existing } = await sb
      .from("promo_codes")
      .select("id")
      .eq("creator_id", prof.id)
      .maybeSingle();
    if (!existing) {
      const base =
        (a.name || a.email.split("@")[0] || "kreator")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 16) || "kreator";
      const rnd = Math.floor(100 + Math.random() * 900);
      await sb.from("promo_codes").insert({
        code: `${base.toUpperCase()}-10`,
        slug: `${base}${rnd}`,
        discount_percent: 10,
        creator_id: prof.id,
        active: true,
      });
    }
    toast("U aprovua dhe u aktivizua si Kreator");
    void load();
  };

  if (apps === null) return <Spinner className="h-6 w-6" />;

  if (missing) {
    return (
      <div className="rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
        Tabela <code>creator_applications</code> nuk ekziston ende. Ekzekuto migrimin
        0006_creators_promos.sql në Supabase.
      </div>
    );
  }

  const socials = (a: CreatorApp) =>
    [
      a.instagram && `IG: ${a.instagram}`,
      a.tiktok && `TikTok: ${a.tiktok}`,
      a.facebook && `FB: ${a.facebook}`,
      a.youtube && `YT: ${a.youtube}`,
      a.website && `Web: ${a.website}`,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="space-y-8">
      {/* Active creators */}
      <div>
        <div className="mb-3 text-[14px] font-bold text-ink">Kreatorët aktivë ({creators.length})</div>
        <div className="rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
          Bëje një përdorues Kreator te tabi <span className="font-semibold text-ink">Përdoruesit</span>,
          pastaj krijo kodin/linkun e tij te <span className="font-semibold text-ink">Promo Kode</span>.
        </div>
        {creators.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {creators.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-ink"
              >
                <Star className="h-3.5 w-3.5 fill-brand text-brand" /> {c.email}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Applications */}
      <div>
        <div className="mb-3 text-[14px] font-bold text-ink">Aplikimet</div>
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[15px] font-bold text-ink">
                    {a.name}
                    <Badge
                      tone={a.status === "approved" ? "brand" : "neutral"}
                      className="text-[10px] capitalize"
                    >
                      {a.status}
                    </Badge>
                  </div>
                  <div className="text-[12.5px] text-ink-3">{a.email}</div>
                  <div className="mt-1.5 text-[12.5px] text-ink-2">{socials(a)}</div>
                  <div className="mt-1 text-[11.5px] text-ink-3">{timeAgo(a.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void approve(a)}>
                    Aprovo
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void reject(a.id)}>
                    Refuzo
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {apps.length === 0 && (
            <div className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-[13.5px] text-ink-3">
              Ende s&apos;ka aplikime për Kreator.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Master Prompts (per tool, per input: prompt + cost) ----
function Collapse({
  title,
  subtitle,
  right,
  defaultOpen,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2/60"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-3 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-ink">{title}</span>
          {subtitle && <span className="block truncate text-[12px] text-ink-3">{subtitle}</span>}
        </span>
        {right}
      </button>
      {open && <div className="border-t border-line px-4 py-4">{children}</div>}
    </div>
  );
}

function MasterPromptsTab() {
  const { toast } = useToast();
  const [prompts, setPrompts] = React.useState<Record<string, string>>({});
  const [costs, setCosts] = React.useState<Record<string, number>>({});
  const [masterPrompt, setMasterPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setLoading(false);
      const { data } = await getSupabaseBrowser()
        .from("app_settings")
        .select("master_prompt, tool_prompts, pricing")
        .eq("id", 1)
        .single();
      setPrompts((data?.tool_prompts as Record<string, string>) ?? {});
      setMasterPrompt((data?.master_prompt as string) ?? "");
      const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
      setCosts((pricing.options as Record<string, number>) ?? {});
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data } = await getSupabaseBrowser()
      .from("app_settings")
      .select("pricing")
      .eq("id", 1)
      .single();
    const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
    // Website base prompt is mirrored into master_prompt for the generate route.
    const webBase = prompts["website.base"] ?? masterPrompt;
    const { error } = await getSupabaseBrowser()
      .from("app_settings")
      .update({
        tool_prompts: prompts,
        master_prompt: webBase,
        pricing: { ...pricing, options: { ...(pricing.options ?? {}), ...costs } },
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    toast(error ? "Gabim: " + error.message : "Master Prompts u ruajtën");
  };

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line-strong bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
        Prompti final = <span className="font-semibold text-ink">Baza</span> e tool-it + prompti i çdo
        opsioni të zgjedhur nga përdoruesi + teksti i tij. Çdo opsion ka koston e vet.
      </div>

      {TOOLS.map((tool) => (
        <Collapse
          key={tool.id}
          title={
            <span className="flex items-center gap-2">
              <tool.icon className="h-4 w-4 text-ink-2" /> {tool.name}
            </span>
          }
          subtitle={tool.tagline}
        >
          <Field label="Baza (prompt fillestar për këtë tool)">
            <Textarea
              value={prompts[`${tool.id}.base`] ?? (tool.id === "website" ? masterPrompt : "")}
              onChange={(e) => setPrompts((p) => ({ ...p, [`${tool.id}.base`]: e.target.value }))}
              className="min-h-[120px] font-mono text-[12.5px]"
              placeholder={`Instruksionet bazë për ${tool.name}…`}
            />
          </Field>

          <div className="mt-4 space-y-3">
            {tool.settings.map((s) => (
              <div key={s.id}>
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-3">
                  <s.icon className="h-3.5 w-3.5" /> {s.label}
                </div>
                <div className="space-y-2">
                  {s.options.map((o) => {
                    const key = `${tool.id}.${s.id}.${o.id}`;
                    return (
                      <Collapse
                        key={o.id}
                        title={o.label}
                        subtitle={o.hint}
                        right={
                          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2">
                            {costs[key] ?? o.cost ?? 0} kredite
                          </span>
                        }
                      >
                        <Field label="Prompt për këtë opsion">
                          <Textarea
                            value={prompts[key] ?? ""}
                            onChange={(e) => setPrompts((p) => ({ ...p, [key]: e.target.value }))}
                            className="min-h-[90px] font-mono text-[12px]"
                            placeholder={`Shto në prompt kur zgjidhet "${o.label}"…`}
                          />
                        </Field>
                        <Field label="Kosto (kredite)" className="mt-3 max-w-[200px]">
                          <Input
                            type="number"
                            value={costs[key] ?? o.cost ?? 0}
                            onChange={(e) =>
                              setCosts((c) => ({ ...c, [key]: parseInt(e.target.value, 10) || 0 }))
                            }
                          />
                        </Field>
                      </Collapse>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Collapse>
      ))}

      <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
        Ruaj Master Prompts
      </Button>
    </div>
  );
}

// ---- Raporto (reports) ----
interface ReportRow {
  id: string;
  user_email: string | null;
  tool_id: string | null;
  kind: string | null;
  message: string | null;
  prompt: string | null;
  target_url: string | null;
  credits_spent: number | null;
  status: string | null;
  created_at: string;
}

function ReportsTab() {
  const { toast } = useToast();
  const { getAccessToken } = useMaro();
  const [rows, setRows] = React.useState<ReportRow[] | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [big, setBig] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!supabaseConfigured) return setRows([]);
    const { data, error } = await getSupabaseBrowser()
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMissing(true);
      setRows([]);
      return;
    }
    setRows((data as ReportRow[]) ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "refund" | "archive") => {
    setBusy(id);
    const token = await getAccessToken();
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id, action }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return toast("Gabim: " + (j.error || res.status));
    }
    toast(action === "refund" ? "Kreditet u kthyen" : "U arkivua");
    void load();
  };

  if (rows === null) return <Spinner className="h-6 w-6" />;

  if (missing) {
    return (
      <div className="rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
        Tabela <code>reports</code> nuk ekziston ende. Ekzekuto migrimin{" "}
        <code>0008_reports_announcements.sql</code> në Supabase.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start gap-4">
            {r.target_url && !r.target_url.startsWith("data:") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.target_url}
                alt=""
                onClick={() => setBig(r.target_url)}
                className="h-16 w-16 shrink-0 cursor-zoom-in rounded-xl border border-line object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                {r.user_email}
                <Badge tone={r.status === "open" ? "neutral" : "brand"} className="text-[10px] capitalize">
                  {r.status}
                </Badge>
                {r.tool_id && <span className="text-[12px] font-normal text-ink-3">· {r.tool_id}</span>}
              </div>
              {r.message && <div className="mt-1 text-[13px] text-ink-2">{r.message}</div>}
              {r.prompt && <div className="mt-1 line-clamp-2 text-[12px] text-ink-3">{r.prompt}</div>}
              <div className="mt-1 text-[11.5px] text-ink-3">
                {timeAgo(r.created_at)} · {r.credits_spent ?? 0} kredite
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                loading={busy === r.id}
                onClick={() => void act(r.id, "refund")}
              >
                Kthe kreditet
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<Archive className="h-3.5 w-3.5" />}
                onClick={() => void act(r.id, "archive")}
              >
                Arkivo
              </Button>
            </div>
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center text-[13.5px] text-ink-3">
          Ende s&apos;ka raporte.
        </div>
      )}

      {big && (
        <div
          onClick={() => setBig(null)}
          className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-ink/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

// ---- Njoftimet (multiple announcements) ----
function newAnnouncement(): Announcement {
  return {
    id: `an_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    pages: [],
    kind: "text",
    active: true,
    title: "",
    body: "",
    ctaLabel: "",
    ctaLink: "",
    bg: "#f3f0fe",
    textColor: "#131316",
    btnColor: "#6b46e5",
    btnTextColor: "#ffffff",
  };
}

function ReklamatTab() {
  const { toast } = useToast();
  const { getAccessToken } = useMaro();
  const [list, setList] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setLoading(false);
      const { data } = await getSupabaseBrowser()
        .from("app_settings")
        .select("pricing")
        .eq("id", 1)
        .single();
      const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
      const existing = pricing.announcements ?? [];
      // Migrate a legacy single ad banner into the list.
      if (!existing.length && pricing.ads?.imageUrl) {
        existing.push({
          id: "legacy",
          pages: pricing.ads.pages ?? [],
          kind: "image",
          imageUrl: pricing.ads.imageUrl,
          link: pricing.ads.link,
          active: true,
        });
      }
      setList(existing);
      setLoading(false);
    })();
  }, []);

  const update = (id: string, patch: Partial<Announcement>) =>
    setList((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const upload = async (id: string, file: File) => {
    if (!file.type.startsWith("image/")) return toast("Zgjidh një imazh.");
    if (file.size > 8 * 1024 * 1024) return toast("Imazhi është shumë i madh (max 8MB).");
    setUploadingId(id);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const token = await getAccessToken();
      const res = await fetch("/api/admin/ad-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ dataUrl }),
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !j.url) return toast("Ngarkimi dështoi: " + (j.error ?? res.status));
      update(id, { imageUrl: j.url });
      toast("Imazhi u ngarkua");
    } finally {
      setUploadingId(null);
    }
  };

  const save = async () => {
    setSaving(true);
    const { data } = await getSupabaseBrowser().from("app_settings").select("pricing").eq("id", 1).single();
    const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
    const { error } = await getSupabaseBrowser()
      .from("app_settings")
      .update({
        pricing: { ...pricing, announcements: list, ads: undefined },
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    toast(error ? "Gabim: " + error.message : "Njoftimet u ruajtën");
  };

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] text-ink-2">Krijo njoftime (imazh ose tekst me buton) mbi prompt box.</p>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setList((l) => [...l, newAnnouncement()])}>
          Shto
        </Button>
      </div>

      {list.map((a) => (
        <div key={a.id} className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="inline-flex rounded-xl border border-line p-0.5">
              {(["text", "image"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => update(a.id, { kind: k })}
                  className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize ${
                    a.kind === k ? "bg-ink text-ink-inv" : "text-ink-2"
                  }`}
                >
                  {k === "text" ? "Tekst" : "Imazh"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                <input
                  type="checkbox"
                  checked={a.active !== false}
                  onChange={(e) => update(a.id, { active: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                Aktiv
              </label>
              <button
                onClick={() => setList((l) => l.filter((x) => x.id !== a.id))}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                aria-label="Fshi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {a.kind === "image" ? (
            <div className="space-y-3">
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.imageUrl} alt="" className="max-h-48 w-full rounded-xl object-contain" />
              ) : null}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-surface-2/50 px-4 py-4 text-[13px] font-semibold text-ink-2">
                <UploadCloud className="h-4 w-4" />
                {uploadingId === a.id ? "Duke ngarkuar…" : a.imageUrl ? "Ndrysho imazhin" : "Ngarko imazh"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(a.id, f);
                    e.target.value = "";
                  }}
                />
              </label>
              <Field label="Link (opsional)">
                <Input value={a.link ?? ""} onChange={(e) => update(a.id, { link: e.target.value })} placeholder="https://…" />
              </Field>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Titulli">
                  <Input value={a.title ?? ""} onChange={(e) => update(a.id, { title: e.target.value })} />
                </Field>
                <Field label="Butoni (tekst)">
                  <Input value={a.ctaLabel ?? ""} onChange={(e) => update(a.id, { ctaLabel: e.target.value })} />
                </Field>
              </div>
              <Field label="Përshkrimi">
                <Input value={a.body ?? ""} onChange={(e) => update(a.id, { body: e.target.value })} />
              </Field>
              <Field label="Butoni (link)">
                <Input value={a.ctaLink ?? ""} onChange={(e) => update(a.id, { ctaLink: e.target.value })} placeholder="https://…" />
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ColorField label="Sfondi" value={a.bg} onChange={(v) => update(a.id, { bg: v })} />
                <ColorField label="Teksti" value={a.textColor} onChange={(v) => update(a.id, { textColor: v })} />
                <ColorField label="Butoni" value={a.btnColor} onChange={(v) => update(a.id, { btnColor: v })} />
                <ColorField label="Teksti i butonit" value={a.btnTextColor} onChange={(v) => update(a.id, { btnTextColor: v })} />
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ink-3">Shfaqet te</div>
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((t) => {
                const on = a.pages?.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      update(a.id, {
                        pages: on ? a.pages.filter((x) => x !== t.id) : [...(a.pages ?? []), t.id],
                      })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${
                      on ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" /> {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center text-[13.5px] text-ink-3">
          Ende s&apos;ka njoftime. Kliko &laquo;Shto&raquo;.
        </div>
      )}

      <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
        Ruaj njoftimet
      </Button>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-medium text-ink-2">{label}</div>
      <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-2 py-1.5">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[12.5px] text-ink outline-none"
        />
      </div>
    </div>
  );
}

// ---- Analytics (prompt views & copies) ----
interface PromptEvent {
  kind: "view" | "copy";
  tool_id: string | null;
  prompt: string;
}

interface PromptStat {
  prompt: string;
  tool_id: string | null;
  views: number;
  copies: number;
}

function AnalyticsTab() {
  const [events, setEvents] = React.useState<PromptEvent[] | null>(null);
  const [missing, setMissing] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setEvents([]);
      const { data, error } = await getSupabaseBrowser()
        .from("prompt_events")
        .select("kind, tool_id, prompt")
        .order("created_at", { ascending: false })
        .limit(8000);
      if (error) {
        setMissing(true);
        setEvents([]);
        return;
      }
      setEvents((data as PromptEvent[]) ?? []);
    })();
  }, []);

  if (events === null) return <Spinner className="h-6 w-6" />;

  if (missing) {
    return (
      <div className="rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
        Tabela <code>prompt_events</code> nuk ekziston ende. Ekzekuto migrimin
        0005_prompt_events.sql në Supabase për të aktivizuar analitikën.
      </div>
    );
  }

  const totalViews = events.filter((e) => e.kind === "view").length;
  const totalCopies = events.filter((e) => e.kind === "copy").length;

  const byPrompt = new Map<string, PromptStat>();
  for (const e of events) {
    const key = e.prompt || "(pa prompt)";
    const cur =
      byPrompt.get(key) ?? { prompt: key, tool_id: e.tool_id, views: 0, copies: 0 };
    if (e.kind === "view") cur.views += 1;
    else cur.copies += 1;
    byPrompt.set(key, cur);
  }
  const rows = Array.from(byPrompt.values())
    .sort((a, b) => b.copies - a.copies || b.views - a.views)
    .slice(0, 100);

  const cards = [
    { label: "Views (prompt të parë)", value: totalViews, icon: Eye },
    { label: "Kopjime prompt", value: totalCopies, icon: Copy },
    {
      label: "Norma e kopjimit",
      value: totalViews ? `${Math.round((totalCopies / totalViews) * 100)}%` : "0%",
      icon: BarChart3,
    },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink-3">
              <c.icon className="h-4 w-4" /> {c.label}
            </div>
            <div className="mt-2 text-[30px] font-extrabold tracking-[-0.03em] text-ink">
              {typeof c.value === "number" ? c.value.toLocaleString() : c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-surface-2 text-[12px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Prompt</th>
              <th className="px-4 py-2.5 font-semibold">Tool</th>
              <th className="px-4 py-2.5 font-semibold">Views</th>
              <th className="px-4 py-2.5 font-semibold">Kopjime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i} className="bg-surface align-top">
                <td className="max-w-md px-4 py-3 text-ink">
                  <span className="line-clamp-2">{r.prompt}</span>
                </td>
                <td className="px-4 py-3 text-ink-2">{r.tool_id ?? ""}</td>
                <td className="px-4 py-3 font-semibold text-ink">{r.views}</td>
                <td className="px-4 py-3 font-semibold text-brand">{r.copies}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-3">
                  Ende s&apos;ka të dhëna. Do të mbushen kur useri sheh/kopjon promptet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Orders ----
interface CreditOrder {
  id: string;
  user_email: string | null;
  credits: number;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string | null;
  created_at: string;
}

function OrdersTab() {
  const [orders, setOrders] = React.useState<CreditOrder[] | null>(null);
  const [missing, setMissing] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setOrders([]);
      const { data, error } = await getSupabaseBrowser()
        .from("credit_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        setMissing(true);
        setOrders([]);
        return;
      }
      setOrders((data as CreditOrder[]) ?? []);
    })();
  }, []);

  if (orders === null) return <Spinner className="h-6 w-6" />;

  if (missing) {
    return (
      <div className="rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
        Tabela <code>credit_orders</code> nuk ekziston ende. Ekzekuto migrimin
        0004_explore_orders.sql në Supabase për të aktivizuar porositë.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-left text-[13.5px]">
        <thead className="bg-surface-2 text-[12px] uppercase tracking-wider text-ink-3">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Përdoruesi</th>
            <th className="px-4 py-2.5 font-semibold">Kredite</th>
            <th className="px-4 py-2.5 font-semibold">Shuma</th>
            <th className="px-4 py-2.5 font-semibold">Statusi</th>
            <th className="px-4 py-2.5 font-semibold">Koha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((o) => (
            <tr key={o.id} className="bg-surface">
              <td className="px-4 py-3 text-ink-2">{o.user_email}</td>
              <td className="px-4 py-3 font-semibold text-ink">{o.credits}</td>
              <td className="px-4 py-3 text-ink-2">
                {(o.amount_cents / 100).toFixed(2)} {o.currency}
              </td>
              <td className="px-4 py-3">
                <Badge tone={o.status === "paid" ? "brand" : "neutral"} className="text-[11px]">
                  {o.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-ink-3">{timeAgo(o.created_at)}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-ink-3">
                Ende s&apos;ka porosi. Kur të lidhen pagesat, porositë shfaqen këtu.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- Pricing ----
function PricingTab() {
  const { toast } = useToast();
  const [pricing, setPricing] = React.useState<PricingConfig>(DEFAULT_PRICING);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setLoading(false);
      const { data } = await getSupabaseBrowser()
        .from("app_settings")
        .select("pricing")
        .eq("id", 1)
        .single();
      const p = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
      // Keep the full config so save() never wipes tools/ads/reklamaProduct.
      setPricing({
        ...p,
        types: { ...DEFAULT_PRICING.types, ...(p.types ?? {}) },
        speed: { ...DEFAULT_PRICING.speed, ...(p.speed ?? {}) },
        tools: { ...DEFAULT_PRICING.tools, ...(p.tools ?? {}) },
        editCost: p.editCost ?? DEFAULT_PRICING.editCost ?? 2,
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await getSupabaseBrowser()
      .from("app_settings")
      .update({ pricing, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    toast(error ? "Gabim: " + error.message : "Çmimet u ruajtën");
  };

  if (loading) return <Spinner className="h-6 w-6" />;

  const types: WebsiteKind[] = ["landing", "business", "platform"];
  const speeds: SpeedKey[] = ["slow", "fast", "2x"];

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="text-[13px] font-bold text-ink">Kosto bazë sipas tipit (kredite)</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {types.map((t) => (
            <Field key={t} label={t}>
              <Input
                type="number"
                value={pricing.types[t]}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    types: { ...p.types, [t]: parseInt(e.target.value, 10) || 0 },
                  }))
                }
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <div className="text-[13px] font-bold text-ink">Shpejtësia (shumëzues çmimi + effort)</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {speeds.map((s) => (
            <div key={s} className="rounded-xl border border-line p-3">
              <div className="mb-2 text-[13px] font-semibold capitalize text-ink">{s}</div>
              <Field label="Shumëzues">
                <Input
                  type="number"
                  step="0.1"
                  value={pricing.speed[s].mult}
                  onChange={(e) =>
                    setPricing((p) => ({
                      ...p,
                      speed: { ...p.speed, [s]: { ...p.speed[s], mult: parseFloat(e.target.value) || 0 } },
                    }))
                  }
                />
              </Field>
              <Field label="Effort" className="mt-2">
                <select
                  value={pricing.speed[s].effort}
                  onChange={(e) =>
                    setPricing((p) => ({
                      ...p,
                      speed: {
                        ...p.speed,
                        [s]: { ...p.speed[s], effort: e.target.value as PricingConfig["speed"][SpeedKey]["effort"] },
                      },
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-[13.5px] text-ink outline-none"
                >
                  {["low", "medium", "high", "xhigh"].map((ef) => (
                    <option key={ef} value={ef}>
                      {ef}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
        Kostot për çdo tool (Web / Logo / Reklama…) tani menaxhohen për çdo opsion te tabi{" "}
        <span className="font-semibold text-ink">Master Prompts</span> — çmim + prompt në një vend.
      </div>

      <div className="mt-5 flex items-end gap-4">
        <Field label="Kosto për ndryshim në editor (kredite)" className="max-w-[240px]">
          <Input
            type="number"
            value={pricing.editCost ?? 2}
            onChange={(e) => setPricing((p) => ({ ...p, editCost: parseInt(e.target.value, 10) || 0 }))}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4 text-[13px] text-ink-2">
        <div className="font-semibold text-ink">Parapamje kostosh</div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
          {types.map((t) => (
            <div key={t}>
              <span className="capitalize">{t}</span>:{" "}
              {speeds.map((s) => (
                <span key={s} className="mr-2 text-ink-3">
                  {s}={creditCost(pricing, t, s)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Button className="mt-5" icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
        Ruaj çmimet
      </Button>
    </div>
  );
}

// ---- Log ----
function LogTab() {
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<GenerationLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<GenerationLog | null>(null);
  const [big, setBig] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setLoading(false);
      const { data } = await getSupabaseBrowser()
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data as GenerationLog[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const copyPrompt = async (l: GenerationLog) => {
    try {
      await navigator.clipboard.writeText(l.final_prompt || l.prompt || "");
      toast("Prompti u kopjua");
    } catch {
      toast("S'u kopjua dot");
    }
  };

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[12px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Imazh</th>
              <th className="px-4 py-2.5 font-semibold">Përdoruesi</th>
              <th className="px-4 py-2.5 font-semibold">Prompt</th>
              <th className="px-4 py-2.5 font-semibold">Tip</th>
              <th className="px-4 py-2.5 font-semibold">Kredite</th>
              <th className="px-4 py-2.5 font-semibold">Koha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => {
              const thumb = l.output_urls?.find((u) => !u.startsWith("data:"));
              return (
                <tr
                  key={l.id}
                  onClick={() => setDetail(l)}
                  className="cursor-pointer bg-surface align-top hover:bg-surface-2/60"
                >
                  <td className="px-4 py-3">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-10 w-10 rounded-lg border border-line object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-ink-3">
                        <FileText className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{l.user_email}</td>
                  <td className="max-w-xs px-4 py-3 text-ink">
                    <span className="line-clamp-2">{l.prompt}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{l.tool_id || l.website_type}</td>
                  <td className="px-4 py-3 font-semibold text-brand">{l.credits_spent}</td>
                  <td className="px-4 py-3 text-ink-3">{timeAgo(l.created_at)}</td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
                  Ende s&apos;ka gjenerime.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="lg">
        {detail && (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold text-ink">{detail.user_email}</div>
                <div className="text-[12px] text-ink-3">
                  {detail.tool_id || detail.website_type} · {detail.credits_spent} kredite · {timeAgo(detail.created_at)}
                </div>
              </div>
              <Button size="sm" icon={<Copy className="h-4 w-4" />} onClick={() => void copyPrompt(detail)}>
                Kopjo promptin
              </Button>
            </div>

            {detail.output_urls && detail.output_urls.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {detail.output_urls.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={u}
                    alt=""
                    onClick={() => setBig(u)}
                    className="h-28 w-28 cursor-zoom-in rounded-xl border border-line object-cover"
                  />
                ))}
              </div>
            )}

            <div className="mt-4 max-h-[40vh] overflow-auto rounded-xl border border-line bg-surface-2 p-4">
              <pre className="whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-ink-2">
                {detail.final_prompt || detail.prompt || "—"}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {big && (
        <div
          onClick={() => setBig(null)}
          className="fixed inset-0 z-[110] grid cursor-zoom-out place-items-center bg-ink/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
        </div>
      )}
    </>
  );
}
