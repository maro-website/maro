"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { AnnouncementBanner } from "@/components/app/AnnouncementBanner";
import { GenerationLoader } from "@/components/app/GenerationLoader";
import { CreationLightbox } from "@/components/app/cards";
import { PromptExpand } from "@/components/app/PromptExpand";
import { FortToggle } from "@/components/fort/FortToggle";
import { FortPanel } from "@/components/fort/FortPanel";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import { toolToFortModule, type FortValue } from "@/lib/fort/types";
import { resolveFortConfig, isFortModuleEnabled } from "@/lib/fort/config";
import { defaultFortValues } from "@/lib/fort/schema";
import { loadFortValues, saveFortValues } from "@/lib/tools/selections";
import { createProjectFromComposer, TYPE_TO_KIND } from "@/lib/services/projectService";
import {
  generateImages,
  InsufficientCreditsError,
  ImageGenerationError,
} from "@/lib/services/imageService";
import {
  findOption,
  getTool,
  toolSelectionCost,
  type ToolDef,
  type ToolSelections,
  type ToolSetting,
} from "@/lib/tools/registry";
import { loadToolSelections, saveToolSelections, saveLastTool } from "@/lib/tools/selections";
import type { ImageCreation, SpeedKey, WebsiteKind } from "@/lib/types";
import { uid } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  ArrowUp,
  Coins,
  Sparkles,
  Check,
  ChevronDown,
  Paperclip,
  X,
  Maximize2,
  Lock,
} from "lucide-react";

const IMG_ERRORS: Record<string, string> = {
  "no-key": "Çelësi i OpenAI nuk është konfiguruar në server ende.",
  unauthorized: "Sesioni skadoi. Hyr përsëri dhe provo sërish.",
  "ai-failed": "Modeli nuk u përgjigj. Provo përsëri ose ndrysho përshkrimin.",
  empty: "Nuk u kthye asnjë imazh. Provo përsëri.",
  "bad-tool": "Tool i pavlefshëm.",
};

const MAX_ATTACHMENTS = 4;

const SPEED_TO_LEGACY: Record<string, SpeedKey> = {
  kadale: "slow",
  normal: "fast",
  fast: "2x",
};

// A single message in the image tool's ChatGPT-style conversation.
type ChatMessage =
  | { id: string; role: "user"; text: string; attachments?: string[] }
  | {
      id: string;
      role: "maro";
      status: "thinking" | "done" | "error";
      creation?: ImageCreation;
      error?: string;
    };

export function ToolComposer({ toolId }: { toolId: string }) {
  const tool = getTool(toolId)!;
  const router = useRouter();
  const { toast } = useToast();
  const { user, credits, hasFort, creations, addProject, addCreation, spendCredits } = useMaro();
  const { pricing, fortConfig } = useSettings(Boolean(user));

  const fortModule = toolToFortModule(tool.id);
  const fortAvailable = Boolean(fortModule && isFortModuleEnabled(fortConfig, fortModule));
  const fortResolved = resolveFortConfig(fortConfig);

  const [prompt, setPrompt] = React.useState("");
  const [selections, setSelections] = React.useState<ToolSelections>(() => loadToolSelections(tool));
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [confirmOpt, setConfirmOpt] = React.useState<{ settingId: string; optionId: string; message: string } | null>(null);
  const [fortEnabled, setFortEnabled] = React.useState(false);
  const [fortValues, setFortValues] = React.useState<Record<string, FortValue>>({});
  const [lightbox, setLightbox] = React.useState<ImageCreation | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const pendingRef = React.useRef(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const creationsRef = React.useRef(creations);
  creationsRef.current = creations;

  const isImage = tool.kind === "image";
  const functional = tool.functional;

  React.useEffect(() => {
    // Reload when the tool changes (e.g. client-side nav between tools).
    setSelections(loadToolSelections(tool));
    // Pull a prompt drafted on the Hub, if any.
    let draft = "";
    try {
      draft = sessionStorage.getItem("maro:hubdraft") || "";
      if (draft) sessionStorage.removeItem("maro:hubdraft");
    } catch {
      /* ignore */
    }
    setPrompt(draft);
    setAttachments([]);
    setFortEnabled(false);
    saveLastTool(tool.id);

    // Open a specific past creation as a conversation (clicked from sidebar).
    let seeded: ChatMessage[] = [];
    try {
      const openId = new URLSearchParams(window.location.search).get("open");
      if (openId) {
        const c = creationsRef.current.find((x) => x.id === openId && x.toolId === tool.id);
        if (c) {
          seeded = [
            { id: uid("u"), role: "user", text: c.prompt || "" },
            { id: uid("m"), role: "maro", status: "done", creation: c },
          ];
        }
      }
    } catch {
      /* ignore */
    }
    setMessages(seeded);
  }, [tool]);

  // Keep the conversation scrolled to the newest message.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Initialize maroFort values (defaults + persisted) once config is available.
  React.useEffect(() => {
    if (!fortModule) return;
    const base = defaultFortValues(fortModule, fortConfig) as Record<string, FortValue>;
    const saved = loadFortValues(tool.id) as Record<string, FortValue>;
    setFortValues({ ...base, ...saved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.id, fortModule, fortConfig]);

  const setFortValue = (id: string, value: FortValue) => {
    setFortValues((prev) => {
      const next = { ...prev, [id]: value };
      saveFortValues(tool.id, next);
      return next;
    });
  };

  const onToggleFort = (next: boolean) => {
    if (!hasFort) {
      router.push("/credits#fort");
      return;
    }
    setFortEnabled(next);
  };

  const cost = toolSelectionCost(tool, selections, pricing.options);
  const creditsRef = React.useRef(credits);
  creditsRef.current = credits;

  const setOption = (settingId: string, optionId: string) => {
    setSelections((prev) => {
      const next = { ...prev, [settingId]: optionId };
      saveToolSelections(tool.id, next);
      return next;
    });
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    Array.from(files)
      .slice(0, room)
      .forEach((f) => {
        if (!f.type.startsWith("image/")) return;
        if (f.size > 8 * 1024 * 1024) {
          toast("Imazhi është shumë i madh (max 8MB).");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => setAttachments((a) => [...a, reader.result as string]);
        reader.readAsDataURL(f);
      });
  };

  const doGenerate = React.useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;

    const fortPayload =
      fortAvailable && fortEnabled && hasFort
        ? { enabled: true, values: fortValues }
        : undefined;

    if (tool.kind === "website") {
      const kind = (TYPE_TO_KIND[selections.type] ?? "business") as WebsiteKind;
      const speed = SPEED_TO_LEGACY[selections.speed] ?? "fast";
      const project = createProjectFromComposer({
        prompt: text,
        websiteType: kind,
        speed,
        selections,
        fort: fortPayload,
      });
      addProject(project);
      router.push(`/projects/${project.id}/generating`);
      return;
    }

    // Image tools — ChatGPT-style: append the prompt as a user message and a
    // "thinking" maro message, then swap in the result (or an error) in place.
    const sentAttachments = attachments.length ? [...attachments] : undefined;
    const maroId = uid("m");
    setMessages((m) => [
      ...m,
      { id: uid("u"), role: "user", text, attachments: sentAttachments },
      { id: maroId, role: "maro", status: "thinking" },
    ]);
    setPrompt("");
    setAttachments([]);
    setLoading(true);
    try {
      const res = await generateImages({
        toolId: tool.id as "logo" | "reklama",
        prompt: text,
        selections,
        quality: "high",
        attachments: sentAttachments,
        fort: fortPayload,
      });
      spendCredits(res.creditsSpent || cost);
      const creation: ImageCreation = {
        id: uid("img"),
        toolId: tool.id,
        prompt: text,
        urls: res.images,
        createdAt: new Date().toISOString(),
      };
      addCreation(creation);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === maroId ? { ...msg, role: "maro", status: "done", creation } : msg
        )
      );
    } catch (err) {
      let errMsg = "Gabim i papritur. Provo përsëri.";
      if (err instanceof InsufficientCreditsError) {
        setShowBuy(true);
        errMsg = "Nuk ke kredite të mjaftueshme.";
      } else if (err instanceof ImageGenerationError) {
        errMsg = IMG_ERRORS[err.code] || `Gabim gjenerimi (${err.code}).`;
        toast(errMsg);
      } else {
        toast(errMsg);
      }
      setMessages((m) =>
        m.map((msg) =>
          msg.id === maroId ? { ...msg, role: "maro", status: "error", error: errMsg } : msg
        )
      );
    } finally {
      setLoading(false);
    }
  }, [prompt, tool, selections, attachments, cost, fortAvailable, fortEnabled, hasFort, fortValues, addProject, router, spendCredits, addCreation, toast]);

  const onGenerate = () => {
    if (!functional) {
      toast(`${tool.name} vjen së shpejti.`);
      return;
    }
    if (!prompt.trim() || loading) return;
    if (!user) {
      pendingRef.current = true;
      setShowAuth(true);
      return;
    }
    if (credits < cost) {
      setShowBuy(true);
      return;
    }
    void doGenerate();
  };

  const onAuthDone = () => {
    setShowAuth(false);
    if (pendingRef.current) {
      pendingRef.current = false;
      setTimeout(() => {
        if (creditsRef.current < cost) setShowBuy(true);
        else void doGenerate();
      }, 500);
    }
  };

  const placeholder =
    tool.id === "website"
      ? "Përshkruaj website-in që do të ndërtosh…"
      : tool.id === "logo"
      ? "Përshkruaj logon: brand, stil, simbol, ngjyra…"
      : tool.id === "reklama"
      ? "Përshkruaj imazhin: produkt, mesazh, stil, ngjyra…"
      : tool.id === "filma"
      ? "Përshkruaj videon që do të krijosh…"
      : tool.id === "prompte"
      ? "Prompte gati për t'u përdorur. Së shpejti…"
      : "Shkruaj tekstin që do të kthehet në zë…";

  return (
    <div className="flex h-full flex-col">
      {/* Scroll area — ChatGPT-style conversation for image tools, plus the
          maroFort expert panel (when enabled). */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto w-full max-w-3xl px-5 pb-6 pt-8 sm:pt-12">
          {!functional && <ComingSoonHero tool={tool} />}

          {functional && isImage && messages.length > 0 && (
            <div className="mb-4 flex flex-col gap-4">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} text={m.text} attachments={m.attachments} />
                ) : (
                  <MaroBubble
                    key={m.id}
                    message={m}
                    toolName={tool.name}
                    onOpen={(c) => setLightbox(c)}
                  />
                )
              )}
            </div>
          )}

          {functional && fortAvailable && fortEnabled && (
            <div className="mb-2">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[13px] font-bold uppercase tracking-wider text-brand">
                  {fortResolved.label}
                </span>
                <span className="text-[12.5px] text-ink-3">Brief ekspert</span>
              </div>
              {fortModule && (
                <FortPanel
                  module={fortModule}
                  config={fortConfig}
                  values={fortValues}
                  onChange={setFortValue}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Docked prompt box */}
      <div className="shrink-0 border-t border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-5 sm:py-4">
          <AnnouncementBanner toolId={tool.id} />

          {attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {attachments.map((src, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white"
                    aria-label="Hiq"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {fortAvailable && (
            <div className="mb-2 flex items-center justify-between px-1">
              <FortToggle
                enabled={fortEnabled}
                locked={!hasFort}
                label={fortResolved.label}
                badgeText={fortResolved.badgeText}
                onToggle={onToggleFort}
                onUpgrade={() => router.push("/credits#fort")}
              />
              {fortEnabled && hasFort && (
                <span className="text-[12px] text-ink-3">Modaliteti ekspert aktiv</span>
              )}
            </div>
          )}

          <div className="group relative rounded-[24px] border border-line-strong bg-surface p-2 shadow-pop">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate();
              }}
              rows={2}
              placeholder={placeholder}
              className="relative block max-h-52 min-h-[64px] w-full resize-none rounded-2xl bg-transparent px-3 pt-2.5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />

            <div className="relative flex flex-wrap items-center gap-2 px-1.5 pb-0.5 pt-1">
              {isImage && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <IconBtn
                    onClick={() => fileRef.current?.click()}
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                    label="Bashkëngjit imazh"
                  >
                    <Paperclip className="h-4 w-4" />
                  </IconBtn>
                </>
              )}
              <IconBtn onClick={() => setExpanded(true)} label="Zgjero promptin">
                <Maximize2 className="h-4 w-4" />
              </IconBtn>

              {tool.settings.map((s) => (
                <SettingSelect
                  key={s.id}
                  setting={s}
                  value={selections[s.id] ?? s.default}
                  onChange={(optId, opt) => {
                    if (opt.confirm) {
                      setConfirmOpt({ settingId: s.id, optionId: optId, message: opt.confirm });
                    } else {
                      setOption(s.id, optId);
                    }
                  }}
                />
              ))}

              <div className="ml-auto flex items-center gap-2.5">
                {functional && (
                  <span className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[13px] font-semibold text-ink-2 sm:inline-flex">
                    <Coins className="h-4 w-4 text-brand" /> {cost}
                  </span>
                )}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={onGenerate}
                  disabled={functional && (!prompt.trim() || loading)}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-xl text-brand-fg transition-all",
                    functional && prompt.trim() && !loading
                      ? "bg-brand hover:bg-brand-hover"
                      : "cursor-not-allowed bg-line-strong text-ink-3"
                  )}
                  aria-label="Gjenero"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-brand-fg" />
                  ) : (
                    <ArrowUp className="h-5 w-5" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
          {!functional && (
            <p className="mt-2 text-center text-[12.5px] text-ink-3">
              {tool.name} vjen së shpejti. Provoje interfejsin, gjenerimi aktivizohet së afërmi.
            </p>
          )}
        </div>
      </div>

      <Modal open={showAuth} onClose={() => setShowAuth(false)} size="sm">
        <ModalHeader
          icon={<Sparkles className="h-5 w-5" />}
          title="Hyr për të gjeneruar"
          description="Krijo llogari ose hyr, pastaj vazhdon menjëherë."
        />
        <div className="px-6 pb-6">
          <AuthPanel onDone={onAuthDone} />
        </div>
      </Modal>

      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />

      <Modal open={confirmOpt !== null} onClose={() => setConfirmOpt(null)} size="sm">
        <ModalHeader icon={<Sparkles className="h-5 w-5" />} title="Je i sigurt?" description={confirmOpt?.message} />
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={() => setConfirmOpt(null)}
            className="flex-1 rounded-xl border border-line-strong bg-surface px-4 py-3 text-[14px] font-semibold text-ink hover:bg-surface-2"
          >
            Anulo
          </button>
          <button
            onClick={() => {
              if (confirmOpt) setOption(confirmOpt.settingId, confirmOpt.optionId);
              setConfirmOpt(null);
            }}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover"
          >
            Po, vazhdo
          </button>
        </div>
      </Modal>

      <PromptExpand
        open={expanded}
        value={prompt}
        onChange={setPrompt}
        onClose={() => setExpanded(false)}
        onSubmit={() => {
          setExpanded(false);
          onGenerate();
        }}
        placeholder={placeholder}
      />

      {lightbox && (
        <CreationLightbox
          creation={lightbox}
          open={lightbox !== null}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

// ---- Small icon button ----
function IconBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2 transition-colors hover:text-ink disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ---- Setting selector (icon + current value; options with coming-soon) ----
function SettingSelect({
  setting,
  value,
  onChange,
}: {
  setting: ToolSetting;
  value: string;
  onChange: (optionId: string, opt: NonNullable<ReturnType<typeof findOption>>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const current = findOption(setting, value) ?? setting.options[0];
  const Icon = setting.icon;

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2"
        title={setting.label}
      >
        <Icon className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[13px] font-semibold text-ink">{current?.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
          >
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">
              {setting.label}
            </div>
            {setting.options.map((o) => {
              const disabled = o.available === false;
              const active = o.id === value;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    onChange(o.id, o);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors",
                    disabled ? "cursor-not-allowed opacity-55" : active ? "bg-brand-soft" : "hover:bg-surface-2"
                  )}
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[13.5px] font-semibold",
                        active ? "text-brand" : "text-ink"
                      )}
                    >
                      {o.label}
                    </span>
                    {o.hint && <span className="block text-[12px] text-ink-3">{o.hint}</span>}
                  </span>
                  {disabled ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
                      <Lock className="h-3 w-3" /> së shpejti
                    </span>
                  ) : (
                    active && <Check className="h-4 w-4 shrink-0 text-brand" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Coming soon hero (Filma / Zo) ----
function ComingSoonHero({ tool }: { tool: ToolDef }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 flex flex-col items-center rounded-3xl border border-line bg-surface px-6 py-16 text-center"
    >
      <div className="relative h-24 w-24">
        {[0, 1, 2].map((n) => (
          <motion.span
            key={n}
            className="absolute inset-0 rounded-full border border-brand"
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: n * 0.5, ease: "easeOut" }}
          />
        ))}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand text-brand-fg">
            <tool.icon className="h-7 w-7" />
          </span>
        </span>
      </div>
      <h1 className="mt-6 text-[26px] font-extrabold tracking-[-0.03em] text-ink">{tool.name}</h1>
      <p className="mt-2 max-w-md text-[14.5px] text-ink-2">{tool.description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-semibold text-ink-2">
        Së shpejti
      </span>
    </motion.div>
  );
}

// ---- Chat bubbles (image tools) ----
function UserBubble({ text, attachments }: { text: string; attachments?: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-brand px-4 py-2.5 text-[15px] leading-relaxed text-brand-fg">
        {attachments && attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ))}
          </div>
        )}
        {text && <p className="whitespace-pre-wrap">{text}</p>}
      </div>
    </motion.div>
  );
}

function MaroBubble({
  message,
  toolName,
  onOpen,
}: {
  message: Extract<ChatMessage, { role: "maro" }>;
  toolName: string;
  onOpen: (c: ImageCreation) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-2.5"
    >
      <span className="mt-0.5 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/symbol.svg" alt="maro" className="h-8 w-8 rounded-lg" draggable={false} />
      </span>
      <div className="min-w-0 max-w-[80%]">
        {message.status === "thinking" && (
          <div className="rounded-3xl rounded-tl-lg border border-line bg-surface px-4 py-4">
            <GenerationLoader variant="image" title={toolName} />
          </div>
        )}
        {message.status === "error" && (
          <div className="rounded-3xl rounded-tl-lg border border-danger/40 bg-danger/5 px-4 py-3 text-[14px] text-danger">
            {message.error || "Gabim gjenerimi."}
          </div>
        )}
        {message.status === "done" && message.creation && (
          <button
            onClick={() => onOpen(message.creation!)}
            className="group block overflow-hidden rounded-3xl rounded-tl-lg border border-line bg-surface transition-shadow hover:shadow-pop"
          >
            <span className="grid grid-cols-1 gap-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.creation.urls[0]}
                alt=""
                className="w-full max-w-sm object-cover transition-transform group-hover:scale-[1.01]"
              />
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
