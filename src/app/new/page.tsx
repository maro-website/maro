"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { WizardTopBar, StepFrame } from "@/components/wizard/WizardChrome";
import { StyleThumb } from "@/components/wizard/StyleThumb";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { ColorInput } from "@/components/ui/Misc";
import { UploadArea } from "@/components/ui/UploadArea";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import { emptyDraft, createProjectFromDraft } from "@/lib/services/projectService";
import { EXAMPLE_PROMPTS } from "@/lib/mock/examples";
import { detectCategory } from "@/lib/mock/themes";
import type { WizardDraft, StyleKey, GenerationMode, LanguageCode } from "@/lib/types";
import { uid } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowRight, Check, Sparkles, ImageOff, X, Zap, Gauge, Gem } from "lucide-react";

const TOTAL = 6;

const STYLES: { key: StyleKey; label: string; desc: string }[] = [
  { key: "minimal", label: "Minimal", desc: "I pastër, i qetë, hapësirë." },
  { key: "premium", label: "Premium", desc: "Elegant, luks, i sofistikuar." },
  { key: "bold", label: "Bold", desc: "I fortë, kontrast, i guximshëm." },
  { key: "editorial", label: "Editorial", desc: "Tipografi, revistë, art." },
  { key: "modern", label: "Modern", desc: "I freskët, teknologjik." },
  { key: "playful", label: "Playful", desc: "Ngjyra, argëtues, dinamik." },
];

const MODES: { key: GenerationMode; label: string; desc: string; icon: React.ElementType; badge?: string }[] = [
  { key: "fast", label: "Fast", desc: "Për një rezultat të shpejtë dhe të pastër.", icon: Zap },
  { key: "smart", label: "Smart", desc: "Balanca më e mirë mes kreativitetit dhe shpejtësisë.", icon: Gauge, badge: "Rekomanduar" },
  { key: "maximum", label: "Maximum", desc: "Për projekte që kërkojnë më shumë detaje.", icon: Gem },
];

function WizardInner() {
  const router = useRouter();
  const { addProject } = useMaro();
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<WizardDraft>(() => emptyDraft());

  const set = <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    const category = draft.category !== "generic" ? draft.category : detectCategory(draft.goal);
    const project = createProjectFromDraft({ ...draft, category });
    addProject(project);
    router.push(`/projects/${project.id}/generating`);
  };

  return (
    <div className="min-h-screen">
      <WizardTopBar onExit={() => router.push("/dashboard")} />

      {step === 0 && (
        <StepFrame
          step={0}
          total={TOTAL}
          title="Çka po marojmë?"
          subtitle="Përshkruaje shkurt biznesin ose website-in që po dëshiron."
          onNext={next}
          nextDisabled={draft.goal.trim().length < 8}
          nextIcon={<ArrowRight className="h-4 w-4" />}
        >
          <Textarea
            autoFocus
            rows={6}
            value={draft.goal}
            onChange={(e) => set("goal", e.target.value)}
            placeholder={
              "Kam një kompani për mirëmbajtjen e kopshteve në Hannover.\nDua një website modern ku klientët mund të shohin shërbimet dhe të kërkojnë ofertë përmes WhatsApp."
            }
            className="text-[15px]"
          />
          <div className="mt-4">
            <div className="mb-2.5 text-[13px] font-semibold text-ink-2">Ose fillo nga një shembull:</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.key}
                  onClick={() => {
                    set("goal", ex.text);
                    set("category", ex.category);
                  }}
                  className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </StepFrame>
      )}

      {step === 1 && (
        <StepFrame
          step={1}
          total={TOTAL}
          title="Na trego pak për biznesin."
          subtitle="Këto detaje ndihmojnë Maro-n të personalizojë website-in tënd."
          onBack={back}
          onNext={next}
          nextDisabled={draft.businessName.trim().length < 2}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emri i biznesit" className="sm:col-span-2">
              <Input value={draft.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="p.sh. Castello Branco" />
            </Field>
            <Field label="Tagline" optional className="sm:col-span-2">
              <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="p.sh. Kuzhinë mesdhetare në zemër të qytetit" />
            </Field>
            <Field label="Email" optional>
              <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="info@shembull.al" />
            </Field>
            <Field label="Telefoni" optional>
              <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+383 44 000 000" />
            </Field>
            <Field label="Lokacioni" optional>
              <Input value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="Prishtinë, Kosovë" />
            </Field>
            <Field label="Gjuha e website-it">
              <Select value={draft.language} onChange={(e) => set("language", e.target.value as LanguageCode)}>
                <option value="sq">Shqip</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </Select>
            </Field>
          </div>
        </StepFrame>
      )}

      {step === 2 && (
        <StepFrame
          step={2}
          total={TOTAL}
          title="Si duket brandi yt?"
          subtitle="Ngarko logon dhe imazhet. Gjithçka ruhet lokalisht në shfletuesin tënd."
          onBack={back}
          onNext={next}
        >
          <div className="space-y-6">
            <div>
              <div className="mb-2.5 text-[13px] font-semibold text-ink">Logo</div>
              {draft.logoUrl ? (
                <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                  <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2">
                    <img src={draft.logoUrl} alt="logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-ink">Logo u ngarkua</div>
                    <div className="text-[12.5px] text-ink-3">Do të përdoret në header të website-it.</div>
                  </div>
                  <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={() => set("logoUrl", undefined)}>
                    Hiq
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <UploadArea
                    compact
                    multiple={false}
                    label="Ngarko logon"
                    hint="PNG ose SVG me sfond transparent"
                    onFiles={(urls) => {
                      set("logoUrl", urls[0]);
                      set("hasLogo", true);
                    }}
                  />
                  <button
                    onClick={() => {
                      set("hasLogo", false);
                      set("logoUrl", undefined);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-6 text-center transition-colors",
                      !draft.hasLogo ? "border-brand bg-brand-soft text-brand" : "border-line-strong text-ink-2 hover:bg-surface-2"
                    )}
                  >
                    <ImageOff className="h-5 w-5" />
                    <span className="text-[12.5px] font-semibold">Nuk kam logo ende</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2.5 text-[13px] font-semibold text-ink">Imazhe të biznesit <span className="font-medium text-ink-3">opsionale</span></div>
              <UploadArea
                compact
                label="Zvarrit imazhet këtu"
                onFiles={(urls) =>
                  set("images", [...draft.images, ...urls.map((url) => ({ id: uid("im"), url }))])
                }
              />
              {draft.images.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {draft.images.map((im) => (
                    <div key={im.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
                      <img src={im.url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => set("images", draft.images.filter((x) => x.id !== im.id))}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[13px] font-semibold text-ink">Ngjyra kryesore</div>
                <ColorInput value={draft.primaryColor} onChange={(v) => set("primaryColor", v)} />
              </div>
              <div>
                <div className="mb-2 text-[13px] font-semibold text-ink">Ngjyra dytësore</div>
                <ColorInput value={draft.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
              </div>
            </div>
          </div>
        </StepFrame>
      )}

      {step === 3 && (
        <StepFrame
          step={3}
          total={TOTAL}
          title="Qysh don me u ndi website-i?"
          subtitle="Zgjidh një stil vizual, ose lëre Maro-n të vendosë për ty."
          onBack={back}
          onNext={next}
        >
          <button
            onClick={() => set("style", "auto")}
            className={cn(
              "mb-4 flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              draft.style === "auto" ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/40"
            )}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-ink">Leje Maro-n me vendos</div>
              <div className="text-[13px] text-ink-2">Zgjedhja e rekomanduar sipas biznesit tënd.</div>
            </div>
            {draft.style === "auto" && <Check className="h-5 w-5 text-brand" />}
          </button>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STYLES.map((s) => {
              const active = draft.style === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => set("style", s.key)}
                  className={cn(
                    "group overflow-hidden rounded-2xl border-2 text-left transition-all",
                    active ? "border-brand shadow-card" : "border-line hover:border-brand/40"
                  )}
                >
                  <div className="relative h-24 border-b border-line">
                    <StyleThumb style={s.key} />
                    {active && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[14px] font-bold text-ink">{s.label}</div>
                    <div className="mt-0.5 text-[12px] text-ink-3">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </StepFrame>
      )}

      {step === 4 && (
        <StepFrame
          step={4}
          total={TOTAL}
          title="Qysh ta marojmë?"
          subtitle="Zgjidh mënyrën e gjenerimit që të përshtatet më së miri."
          onBack={back}
          onNext={next}
        >
          <div className="grid gap-3">
            {MODES.map((m) => {
              const active = draft.generationMode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => set("generationMode", m.key)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all",
                    active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/40"
                  )}
                >
                  <div className={cn("grid h-11 w-11 place-items-center rounded-xl", active ? "bg-brand text-white" : "bg-surface-2 text-ink-2")}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-bold text-ink">{m.label}</span>
                      {m.badge && (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-bold text-white">{m.badge}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13.5px] text-ink-2">{m.desc}</div>
                  </div>
                  <span className={cn("grid h-5 w-5 place-items-center rounded-full border-2", active ? "border-brand bg-brand" : "border-line-strong")}>
                    {active && <Check className="h-3 w-3 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </StepFrame>
      )}

      {step === 5 && (
        <StepFrame
          step={5}
          total={TOTAL}
          title="Gati për t'u maruar."
          subtitle="Kontrollo detajet dhe kliko Maro Website për të filluar gjenerimin."
          onBack={back}
          onNext={finish}
          nextLabel="Maro Website"
          nextIcon={<Sparkles className="h-4 w-4" />}
        >
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <ReviewRow label="Biznesi" value={draft.businessName || "—"} />
            <ReviewRow label="Qëllimi" value={draft.goal || "—"} multiline />
            <ReviewRow label="Gjuha" value={{ sq: "Shqip", en: "English", de: "Deutsch" }[draft.language]} />
            <ReviewRow
              label="Logo"
              value={draft.logoUrl ? "E ngarkuar" : draft.hasLogo ? "—" : "Nuk ka ende"}
              media={draft.logoUrl}
            />
            <ReviewRow label="Imazhe" value={`${draft.images.length} imazhe`} />
            <ReviewRow label="Stili" value={draft.style === "auto" ? "Maro vendos" : STYLES.find((s) => s.key === draft.style)?.label ?? "—"} />
            <ReviewRow label="Mënyra" value={MODES.find((m) => m.key === draft.generationMode)?.label ?? "—"} last />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-[13px] text-brand">
            <Sparkles className="h-4 w-4" /> Gjenerimi do të përdorë 20 kredite.
          </div>
        </StepFrame>
      )}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
  media,
  last,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  media?: string;
  last?: boolean;
}) {
  return (
    <div className={cn("flex gap-4 px-5 py-3.5", !last && "border-b border-line")}>
      <div className="w-24 shrink-0 pt-0.5 text-[13px] font-semibold text-ink-3">{label}</div>
      <div className={cn("flex-1 text-[14px] text-ink", multiline ? "leading-relaxed" : "truncate")}>
        {media ? (
          <div className="flex items-center gap-2">
            <img src={media} alt="" className="h-8 w-8 rounded-lg border border-line object-contain" />
            {value}
          </div>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <AuthGate>
      <WizardInner />
    </AuthGate>
  );
}
