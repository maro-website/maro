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
import { IMAGE_TOOLS } from "@/lib/tools/registry";
import { timeAgo } from "@/lib/utils/format";
import { Users, FileText, Coins, ScrollText, Save, Shield, Wand2 } from "lucide-react";

type Tab = "users" | "prompt" | "tools" | "pricing" | "log";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "users", label: "Përdoruesit", icon: Users },
  { key: "prompt", label: "Master Prompt", icon: FileText },
  { key: "tools", label: "Tools", icon: Wand2 },
  { key: "pricing", label: "Çmimet", icon: Coins },
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
  const [tab, setTab] = React.useState<Tab>("users");
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
          {tab === "users" && <UsersTab />}
          {tab === "prompt" && <PromptTab />}
          {tab === "tools" && <ToolsTab />}
          {tab === "pricing" && <PricingTab />}
          {tab === "log" && <LogTab />}
        </div>
      </main>
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
        pricing: { ...pricing, tools: { ...(pricing.tools ?? {}), ...costs } },
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
      setPricing({
        types: { ...DEFAULT_PRICING.types, ...(p.types ?? {}) },
        speed: { ...DEFAULT_PRICING.speed, ...(p.speed ?? {}) },
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
