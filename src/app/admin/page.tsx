"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
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
} from "@/lib/supabase/types";
import { buildComposedGenerateSystem, buildComposedGenerateUser } from "@/lib/ai/prompts";
import { IMAGE_TOOLS, TOOLS } from "@/lib/tools/registry";
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
} from "lucide-react";

type Tab =
  | "overview"
  | "users"
  | "prompt"
  | "tools"
  | "reklamat"
  | "pricing"
  | "orders"
  | "log";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Përdoruesit", icon: Users },
  { key: "prompt", label: "Master Prompt", icon: FileText },
  { key: "tools", label: "Tools", icon: Wand2 },
  { key: "reklamat", label: "Reklamat", icon: Megaphone },
  { key: "pricing", label: "Çmimet", icon: Coins },
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
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink">Admin</h1>
            <p className="text-[13.5px] text-ink-3">Menaxho përdoruesit, kreditet, promptin dhe çmimet.</p>
          </div>
        </div>

        {!supabaseConfigured && (
          <div className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
            Supabase nuk është konfiguruar. Shto çelësat te .env.local për të aktivizuar panelin.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${
                tab === t.key ? "bg-brand text-brand-fg" : "text-ink-2 hover:bg-surface-2"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && <OverviewTab />}
          {tab === "users" && <UsersTab />}
          {tab === "prompt" && <PromptTab />}
          {tab === "tools" && <ToolsTab />}
          {tab === "reklamat" && <ReklamatTab />}
          {tab === "pricing" && <PricingTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "log" && <LogTab />}
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
      .select("id, email, full_name, credits, is_admin, created_at")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

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
                <td colSpan={3} className="px-4 py-8 text-center text-ink-3">
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

// ---- Master prompt ----
function PromptTab() {
  const { toast } = useToast();
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setLoading(false);
      const { data } = await getSupabaseBrowser()
        .from("app_settings")
        .select("master_prompt")
        .eq("id", 1)
        .single();
      setPrompt(data?.master_prompt ?? "");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await getSupabaseBrowser()
      .from("app_settings")
      .update({ master_prompt: prompt, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    toast(error ? "Gabim: " + error.message : "Master prompt u ruajt");
  };

  const previewSystem = buildComposedGenerateSystem(
    {
      businessName: "Shembull Biznesi",
      goal: "",
      category: "generic",
      language: "sq",
      primaryColor: "#5a28e5",
      userPrompt: "Një website për një kafe artizanale me menu dhe galeri",
      websiteType: "business",
      speed: "fast",
    },
    prompt
  );
  const previewUser = buildComposedGenerateUser({
    businessName: "Shembull Biznesi",
    goal: "",
    category: "generic",
    language: "sq",
    primaryColor: "#5a28e5",
    userPrompt: "Një website për një kafe artizanale me menu dhe galeri",
    websiteType: "business",
    speed: "fast",
  });

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <Field label="Master prompt" hint="Ky tekst i paraprin promptit të përdoruesit para se t'i dërgohet modelit.">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[360px] font-mono text-[12.5px]"
          />
        </Field>
        <Button className="mt-3" icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
          Ruaj master prompt
        </Button>
      </div>
      <div>
        <div className="mb-1.5 text-[13px] font-semibold text-ink">Preview i promptit final</div>
        <div className="max-h-[440px] overflow-auto rounded-xl border border-line bg-surface-2 p-4">
          <pre className="whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-ink-2">
{previewSystem}
{"\n\n===== USER MESSAGE =====\n\n"}
{previewUser}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ---- Tools (image tools master prompts + cost) ----
function ToolsTab() {
  const { toast } = useToast();
  const [prompts, setPrompts] = React.useState<Record<string, string>>({});
  const [costs, setCosts] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setLoading(false);
      const { data } = await getSupabaseBrowser()
        .from("app_settings")
        .select("tool_prompts, pricing")
        .eq("id", 1)
        .single();
      setPrompts((data?.tool_prompts as Record<string, string>) ?? {});
      const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
      setCosts({ ...(DEFAULT_PRICING.tools ?? {}), ...(pricing.tools ?? {}) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    // Merge tool costs into the existing pricing json.
    const { data } = await getSupabaseBrowser()
      .from("app_settings")
      .select("pricing")
      .eq("id", 1)
      .single();
    const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
    const { error } = await getSupabaseBrowser()
      .from("app_settings")
      .update({
        tool_prompts: prompts,
        pricing: {
          ...pricing,
          tools: { ...(pricing.tools ?? {}), ...costs },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    toast(error ? "Gabim: " + error.message : "Tools u ruajtën");
  };

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <div className="space-y-6">
      <p className="text-[13.5px] leading-relaxed text-ink-2">
        Vendos këtu instruksionet (master prompt) të çdo Custom GPT-je. Ky tekst i paraprin
        përshkrimit të përdoruesit para se t&apos;i dërgohet OpenAI (gpt-image-2).
      </p>
      {IMAGE_TOOLS.map((tool) => (
        <div key={tool.id} className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ color: tool.accent, background: tool.accentSoft }}
            >
              <tool.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[14px] font-bold text-ink">{tool.name}</div>
              <div className="text-[12px] text-ink-3">{tool.tagline}</div>
            </div>
          </div>

          <Field label="Master prompt (nga Custom GPT)" className="mt-4">
            <Textarea
              value={prompts[tool.id] ?? ""}
              onChange={(e) => setPrompts((p) => ({ ...p, [tool.id]: e.target.value }))}
              className="min-h-[160px] font-mono text-[12.5px]"
              placeholder={`Ngjit instruksionet e ${tool.name} këtu…`}
            />
          </Field>

          <Field label="Kosto për gjenerim (kredite)" className="mt-3 max-w-[220px]">
            <Input
              type="number"
              value={costs[tool.id] ?? tool.defaultCost}
              onChange={(e) =>
                setCosts((c) => ({ ...c, [tool.id]: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </Field>
        </div>
      ))}

      <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
        Ruaj tools
      </Button>
    </div>
  );
}

// ---- Reklamat (ad banners) ----
function ReklamatTab() {
  const { toast } = useToast();
  const { getAccessToken } = useMaro();
  const [imageUrl, setImageUrl] = React.useState("");
  const [link, setLink] = React.useState("");
  const [pages, setPages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    (async () => {
      if (!supabaseConfigured) return setLoading(false);
      const { data } = await getSupabaseBrowser()
        .from("app_settings")
        .select("pricing")
        .eq("id", 1)
        .single();
      const ads = ((data?.pricing as PricingConfig) ?? DEFAULT_PRICING).ads;
      setImageUrl(ads?.imageUrl ?? "");
      setLink(ads?.link ?? "");
      setPages(ads?.pages ?? []);
      setLoading(false);
    })();
  }, []);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast("Zgjidh një imazh.");
    if (file.size > 8 * 1024 * 1024) return toast("Imazhi është shumë i madh (max 8MB).");
    setUploading(true);
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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dataUrl }),
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !j.url) return toast("Ngarkimi dështoi: " + (j.error ?? res.status));
      setImageUrl(j.url);
      toast("Imazhi u ngarkua");
    } finally {
      setUploading(false);
    }
  };

  const togglePage = (id: string) =>
    setPages((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    setSaving(true);
    const { data } = await getSupabaseBrowser()
      .from("app_settings")
      .select("pricing")
      .eq("id", 1)
      .single();
    const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
    const { error } = await getSupabaseBrowser()
      .from("app_settings")
      .update({
        pricing: {
          ...pricing,
          ads: { imageUrl: imageUrl || undefined, link: link || undefined, pages },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    toast(error ? "Gabim: " + error.message : "Reklama u ruajt");
  };

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-[13.5px] leading-relaxed text-ink-2">
        Ngarko një banner reklame dhe zgjidh në cilat tools shfaqet mbi prompt box. Useri e
        sheh banner-in kur hap ato faqe.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className={`grid place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          drag ? "border-brand bg-brand-soft" : "border-line-strong bg-surface-2/50"
        }`}
      >
        {imageUrl ? (
          <div className="w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="mx-auto max-h-56 rounded-xl object-contain" />
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} loading={uploading}>
                Ndrysho
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setImageUrl("")}
              >
                Hiq
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center text-ink-3"
          >
            <UploadCloud className="h-8 w-8" />
            <span className="mt-2 text-[14px] font-semibold text-ink">
              {uploading ? "Duke ngarkuar…" : "Kliko ose tërhiq një imazh këtu"}
            </span>
            <span className="mt-1 text-[12.5px]">PNG / JPG, deri 8MB</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="text-[13px] font-bold text-ink">Shfaqet te</div>
        <div className="mt-3 flex flex-col gap-2">
          {TOOLS.map((t) => (
            <label
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
            >
              <span className="flex items-center gap-2.5 text-[14px] font-medium text-ink">
                <t.icon className="h-4 w-4 text-brand" /> {t.name}
              </span>
              <input
                type="checkbox"
                checked={pages.includes(t.id)}
                onChange={() => togglePage(t.id)}
                className="h-5 w-5 accent-brand"
              />
            </label>
          ))}
        </div>
      </div>

      <Field label="Link (opsional) — hapet kur klikohet banner-i">
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
      </Field>

      <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
        Ruaj reklamën
      </Button>
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
      <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
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

      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <div className="text-[13px] font-bold text-ink">Kosto për imazh (kredite)</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {IMAGE_TOOLS.map((t) => (
            <Field key={t.id} label={t.name}>
              <Input
                type="number"
                value={pricing.tools?.[t.id] ?? t.defaultCost}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    tools: { ...(p.tools ?? {}), [t.id]: parseInt(e.target.value, 10) || 0 },
                  }))
                }
              />
            </Field>
          ))}
        </div>
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
  const [logs, setLogs] = React.useState<GenerationLog[]>([]);
  const [loading, setLoading] = React.useState(true);

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

  if (loading) return <Spinner className="h-6 w-6" />;

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-surface-2 text-[12px] uppercase tracking-wider text-ink-3">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Përdoruesi</th>
            <th className="px-4 py-2.5 font-semibold">Prompt</th>
            <th className="px-4 py-2.5 font-semibold">Tip</th>
            <th className="px-4 py-2.5 font-semibold">Shpejt.</th>
            <th className="px-4 py-2.5 font-semibold">Kredite</th>
            <th className="px-4 py-2.5 font-semibold">Koha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {logs.map((l) => (
            <tr key={l.id} className="bg-surface align-top">
              <td className="px-4 py-3 text-ink-2">{l.user_email}</td>
              <td className="max-w-xs px-4 py-3 text-ink">
                <span className="line-clamp-2">{l.prompt}</span>
              </td>
              <td className="px-4 py-3 text-ink-2">{l.tool_id || l.website_type}</td>
              <td className="px-4 py-3 text-ink-2">{l.speed}</td>
              <td className="px-4 py-3 font-semibold text-brand">{l.credits_spent}</td>
              <td className="px-4 py-3 text-ink-3">{timeAgo(l.created_at)}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
                Ende s'ka gjenerime.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
