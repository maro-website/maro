"use client";

import * as React from "react";
import { AttachmentPicker } from "@/components/app/AttachmentPicker";
import { MAX_COMPOSER_ATTACHMENTS as MAX_ATTACHMENTS } from "@/lib/config/attachments";
import { composerDraftKey, currentComposerDraft, loadComposerDraft, saveComposerDraft, emptyComposerDraft } from "@/lib/services/composerDraft";
import { activeConversationKey, conversationHistory, imageConversationId, type ConversationJob } from "@/lib/creations/conversations";
import { buildGenerationSelections } from "@/lib/marologo/generation";
import { fetchConversationHistory } from "@/lib/services/creationsService";
import { useComposerDraft } from "@/lib/hooks/useComposerDraft";
import { resolvePrivateAssetRefsStrict } from "@/lib/services/projectAssetService";
import type { LibrarySelection } from "@/lib/services/assetLibrary";
import { GenerateButton } from "@/components/app/GenerateButton";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useMenuKeyboard } from "@/components/ui/useMenuKeyboard";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { PlatformNotices } from "@/components/app/PlatformNotices";
import { OptionIcon, MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { getProductBrand } from "@/lib/design/maro-system";
import { GenerationCard, type GenerationCardMessage } from "@/components/app/GenerationCard";
import { StableImage } from "@/components/app/StableImage";
import { GalleryMasonry } from "@/components/app/GalleryMasonry";
import { CreationLightbox } from "@/components/app/cards";
import { resolveGenerationLabels } from "@/lib/design/generationMeta";
import { GPT_IMAGE_PROMPT_MAX_CHARS } from "@/lib/generation/imagePromptValidation";
import { PromptExpand } from "@/components/app/PromptExpand";
import { Switch } from "@/components/ui/Switch";
import { BrainPill, PresetPill } from "@/components/app/PromptAccessoryRow";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { LOCAL_WORKSPACE_SCOPE } from "@/lib/storage/local";
import { isBrainConfigured } from "@/lib/workspaces/brainProfile";
import {
  fetchBrainProfile,
  fetchWorkspaceSources,
} from "@/lib/workspaces/brainService";
import { useV1ImageModels } from "@/lib/hooks/useV1ImageModels";
import { useSettings } from "@/lib/hooks/useSettings";
import { createProjectFromComposer, TYPE_TO_KIND } from "@/lib/services/projectService";
import {
  MAX_PROJECT_ASSET_FILE_BYTES,
  MAX_IMAGE_REFERENCE_FILE_BYTES,
  projectAssetErrorMessage,
  uploadProjectAssetDataUrl,
} from "@/lib/services/projectAssetService";
import {
  uploadOrResolvePrivateAttachment,
  type PrivateImageAttachment,
} from "@/lib/services/privateImageAttachment";
import {
  generateImages,
  InsufficientCreditsError,
  ImageGenerationError,
} from "@/lib/services/imageService";
import { generateAudio, AudioGenerationError } from "@/lib/services/audioService";
import { V1_IMAGE_ERRORS, imageErrorMessage } from "@/lib/services/imageErrors";
import { createImageDraftAcceptance } from "@/lib/services/imageDraft";
import { fetchPromptDetail } from "@/lib/services/promptsService";
import {
  findOption,
  defaultSelections,
  getTool,
  toolSelectionCost,
  visibleSettings,
  MAIN_TOOLS,
  IMAGE_TOOLS,
  type ToolDef,
  type ToolSelections,
  type ToolSetting,
} from "@/lib/tools/registry";
import { loadToolSelections, saveToolSelections, saveLastTool } from "@/lib/tools/selections";
import type { ToolOptionIcons } from "@/lib/tools/optionIcons";
import { PROMPT_ATTACH_KEY, type PromptAttach } from "@/lib/prompts/types";
import { presetInitialPrompt, presetSelections, presetToolFromTarget } from "@/lib/presets/model";
import { MARO_IMAGE_URL_MIME, MARO_PRESET_MIME, readInspirationDrop } from "@/lib/modules/imazh/inspiration";
import type { ImageCreation, SpeedKey, WebsiteKind } from "@/lib/types";
import { uid } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  Sparkles,
  Check,
  ChevronDown,
  Paperclip,
  X,
  Maximize2,
  Lock,
  AudioLines,
  Mic,
  Eraser,
  Wrench,
  ImagePlus,
  Loader2,
  RefreshCw,
} from "lucide-react";

const IMG_ERRORS: Record<string, string> = {
  "no-key": "Gjenerimi nuk është i disponueshëm. Provo më vonë.",
  unauthorized: "Sesioni skadoi. Hyr përsëri dhe provo sërish.",
  "ai-failed": "Modeli nuk u përgjigj. Provo përsëri ose ndrysho përshkrimin.",
  job_create_failed: "Gjenerimi dështoi në server. Provo përsëri pas pak sekondash.",
  jobs_table_missing:
    "Gjenerimi nuk është i disponueshëm. Kontakto support.",
  jobs_db_permission: "Serveri nuk ka akses në bazën e të dhënave. Kontakto support.",
  concurrency_limit: "Ke një gjenerim aktiv. Prit pak sekonda dhe provo sërish.",
  platform_busy: "Platforma është e ngarkuar. Provo përsëri pas pak.",
  rate_limited: "Shumë kërkesa shpejt. Prit pak dhe provo sërish.",
  email_not_verified: "Verifiko email-in para se të gjenerosh.",
  generation_paused: "Gjenerimi është pezulluar për llogarinë tënde.",
  empty: "Nuk u kthye asnjë imazh. Provo përsëri.",
  "bad-tool": "Tool i pavlefshëm.",
  "http-524": "Gjenerimi zgjati shumë (Cloudflare timeout). Provo përsëri.",
  "http-504": "Gjenerimi zgjati shumë dhe u ndërpre. Provo përsëri.",
  payload_too_large: "Referenca është tepër e madhe për t’u dërguar. Hiqe dhe ngarkoje përsëri që të ruhet privatisht.",
  reference_not_uploaded: "Referenca nuk u ngarkua. Hiqe dhe provo ta ngarkosh përsëri.",
  invalid_image_reference: "Referenca e imazhit nuk është e vlefshme.",
  forbidden_reference: "Nuk ke qasje në këtë referencë private.",
  reference_not_found: "Referenca nuk u gjet më. Ngarkoje përsëri.",
  file_too_large: "Imazhi është tepër i madh. Përdor PNG, JPG ose WebP deri në 25 MB.",
  unsupported_mime: "Formati nuk mbështetet. Përdor PNG, JPG ose WebP.",
  ...V1_IMAGE_ERRORS,
};

const AUDIO_ERRORS: Record<string, string> = {
  "no-key": "Çelësi i ElevenLabs nuk është konfiguruar në server ende.",
  unauthorized: "Sesioni skadoi. Hyr përsëri dhe provo sërish.",
  "ai-failed": "Modeli nuk u përgjigj. Provo përsëri.",
  empty: "Nuk u kthye asnjë audio. Provo përsëri.",
  "missing-audio": "Ngarko një audio për këtë mënyrë.",
  "missing-prompt": "Shkruaj një përshkrim.",
  "bad-mode": "Mënyrë e pavlefshme.",
  "bad-tool": "Tool i pavlefshëm.",
};

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const IMAGE_REFERENCE_TRANSFER_KEY = "maro:image-reference";

const SPEED_TO_LEGACY: Record<string, SpeedKey> = {
  kadale: "slow",
  normal: "fast",
  fast: "2x",
};

function noticeModuleId(toolId: string): string {
  if (toolId === "reklama" || toolId === "maro_imazh") return "maroImazh";
  if (toolId === "logo" || toolId === "maro_logo") return "maroLogo";
  if (toolId === "website" || toolId === "web") return "maroWeb";
  if (toolId === "filma") return "maroFilma";
  if (toolId === "audio" || toolId === "zo") return "maroZo";
  return toolId;
}

type ChatMessage = GenerationCardMessage & { role: "generation" };

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

export function ToolComposer({
  toolId,
  layout = "conversation",
  headerSlot,
  promptAttach: promptAttachProp,
  onPromptAttachChange,
}: {
  toolId: string;
  layout?: "conversation" | "gallery";
  headerSlot?: React.ReactNode;
  promptAttach?: PromptAttach | null;
  onPromptAttachChange?: (attach: PromptAttach | null) => void;
}) {
  const tool = getTool(toolId)!;
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const requestedConversation = searchParams.get("chat");
  const isReadOnlyView = false;
  const { toast } = useToast();
  const { user, ready, credits, creations, addProject, addCreation, spendCredits, activeWorkspaceScope } = useMaro();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id ?? activeWorkspaceScope ?? LOCAL_WORKSPACE_SCOPE;
  const conversationUserId = user?.id;
  const conversationScope = activeConversationKey(user?.id, workspaceId, tool.id);
  const pendingAuthDraft = React.useRef<{ id: string; draft: ReturnType<typeof emptyComposerDraft> } | null>(null);
  const [activeConversation, setActiveConversation] = React.useState({ key: "", id: "" });
  React.useEffect(() => {
    if (!ready) return;
    const opened = openId ? creations.find(item => item.id === openId) : undefined;
    const requested = requestedConversation ?? (opened ? imageConversationId(opened) : openId);
    let stored: string | null = null;
    try { stored = localStorage.getItem(conversationScope); } catch { /* Browser storage can be unavailable. */ }
    const resumed = conversationUserId ? pendingAuthDraft.current : null;
    const id = resumed?.id || requested || stored || crypto.randomUUID();
    if (resumed) {
      saveComposerDraft(composerDraftKey(conversationUserId, workspaceId, `${tool.id}:${id}`), resumed.draft);
      pendingAuthDraft.current = null;
    }
    if (!requested && !stored) {
      const oldKey = composerDraftKey(conversationUserId, workspaceId, tool.id);
      const nextKey = composerDraftKey(conversationUserId, workspaceId, `${tool.id}:${id}`);
      void Promise.all([loadComposerDraft(oldKey), loadComposerDraft(nextKey)]).then(([previous]) => {
        const next = currentComposerDraft(nextKey);
        if (!next.prompt && !next.privateImageAttachments.length && !next.attachments.length && !next.audioInput && !next.promptAttach && (previous.prompt || previous.privateImageAttachments.length || previous.attachments.length || previous.audioInput || previous.promptAttach)) {
          saveComposerDraft(nextKey, previous);
          if (currentComposerDraft(oldKey) === previous) saveComposerDraft(oldKey, emptyComposerDraft());
        }
      });
    }
    try { if (resumed || !requested || !stored) localStorage.setItem(conversationScope, id); } catch { /* In-memory navigation still works. */ }
    setActiveConversation(current => current.key === conversationScope && current.id === id ? current : { key: conversationScope, id });
  }, [ready, conversationScope, requestedConversation, openId, creations, conversationUserId, workspaceId, tool.id]);
  const conversationId = activeConversation.key === conversationScope ? activeConversation.id : "";
  const draftKey = composerDraftKey(user?.id, workspaceId, `${tool.id}:${conversationId}`);
  const { pricing, toolOptionIcons } = useSettings(Boolean(user));


  const { prompt, setPrompt, attachments, setAttachments, privateImageAttachments, setPrivateImageAttachments, audioInput, setAudioInput, promptAttach: promptAttachInternal, setPromptAttachInternal, draftReady: loadedDraftReady } = useComposerDraft(draftKey);
  const draftReady = loadedDraftReady && Boolean(conversationId);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = React.useState(false);
  const [webPreviews, setWebPreviews] = React.useState<Record<string, string>>({});
  const [selections, setSelections] = React.useState<ToolSelections>(() => defaultSelections(tool));
  const generateButtonRef = React.useRef<HTMLButtonElement>(null);
  const [uploadingReferences, setUploadingReferences] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const [mobileComposerOpen, setMobileComposerOpen] = React.useState(false);
  const [mobileResultOpen, setMobileResultOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [serverPromptLimit, setServerPromptLimit] = React.useState<number | null>(null);
  const promptCountId = React.useId();
  const [expanded, setExpanded] = React.useState(false);
  const [confirmOpt, setConfirmOpt] = React.useState<{ settingId: string; optionId: string; message: string } | null>(null);
  const [lightbox, setLightbox] = React.useState<ImageCreation | null>(null);
  // maro Prompts: a curated prompt attached from /prompts (hidden template).
  const promptAttachControlled = onPromptAttachChange !== undefined;
  const promptAttach = promptAttachControlled ? (promptAttachProp ?? null) : promptAttachInternal;
  const setPromptAttach = React.useCallback(
    (attach: PromptAttach | null) => {
      setPromptAttachInternal(attach);
      if (promptAttachControlled) onPromptAttachChange!(attach);
    },
    [promptAttachControlled, onPromptAttachChange, setPromptAttachInternal]
  );
  const presetHydration = React.useRef<{ key: string; prop: PromptAttach | null | undefined } | null>(null);
  React.useEffect(() => {
    if (!draftReady || !ready || !promptAttachControlled) return;
    if (presetHydration.current?.key !== draftKey) {
      presetHydration.current = { key: draftKey, prop: promptAttachProp };
      onPromptAttachChange?.(promptAttachInternal);
    } else if (presetHydration.current.prop !== promptAttachProp) {
      presetHydration.current.prop = promptAttachProp;
      setPromptAttachInternal(promptAttachProp ?? null);
    }
  }, [draftReady, ready, draftKey, promptAttachControlled, promptAttachProp, promptAttachInternal, onPromptAttachChange, setPromptAttachInternal]);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [serverHistory, setServerHistory] = React.useState<{ scope: string; items: ImageCreation[]; jobs: ConversationJob[] }>({ scope: "", items: [], jobs: [] });
  const [historyError, setHistoryError] = React.useState(false);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const historyUserId = user?.id;
  React.useEffect(() => {
    if (!historyUserId || !conversationId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scope = `${conversationScope}:${conversationId}`;
    const refresh = () => {
      clearTimeout(timer);
      void fetchConversationHistory(conversationId).then(result => {
        if (!active) return;
        setHistoryError(!result);
        if (result) setServerHistory({ scope, ...result });
        // Resume observation after navigation/reload, without starting another job.
        if (!result || result.jobs.some(job => job.status === "thinking") || loading) timer = setTimeout(refresh, 5000);
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [conversationId, conversationScope, historyUserId, loading, historyRefresh]);
  const recoveredJobs = serverHistory.scope === `${conversationScope}:${conversationId}` ? serverHistory.jobs : [];
  const recoveredPending = recoveredJobs.some(job => job.status === "thinking");
  const history = React.useMemo(() => {
    const items = new Map((serverHistory.scope === `${conversationScope}:${conversationId}` ? serverHistory.items : []).map(item => [item.id, item]));
    for (const creation of creations) {
      const stored = items.get(creation.id);
      items.set(creation.id, stored ? { ...creation, ...stored, favourite: creation.favourite ?? stored.favourite, title: creation.title ?? stored.title } : creation);
    }
    return conversationHistory([...items.values()], conversationId, workspaceId);
  }, [creations, conversationId, workspaceId, conversationScope, serverHistory]);
  const logoWizard = [...history].reverse().find(item => item.logoWizard)?.logoWizard;
  const lastOutputRef = [...history].reverse().find(item => item.storageRefs?.length)?.storageRefs?.[0];
  const hydratedConversation = React.useRef("");
  React.useEffect(() => {
    const preservePending = hydratedConversation.current === conversationId;
    hydratedConversation.current = conversationId;
    const saved: ChatMessage[] = history.map(creation => ({
      id: `generation-${creation.id}`, role: "generation", text: creation.prompt,
      status: "done", creation, createdAt: creation.createdAt, mediaType: creation.mediaType ?? "image", attachments: creation.inputUrls,
      format: creation.format, size: creation.size, formatLabel: creation.formatLabel,
      modelLabel: creation.modelLabel, speedLabel: creation.speedLabel, brain: creation.brain,
      promptCode: creation.promptCode,
    }));
    setMessages(current => [...saved, ...(preservePending ? current.filter(message => message.status !== "done") : [])]);
  }, [history, conversationId]);
  const [dragOver, setDragOver] = React.useState(false);
  const dragDepth = React.useRef(0);
  const pendingRef = React.useRef(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const audioFileRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const privateImageAttachmentsRef = React.useRef(privateImageAttachments);
  const attachmentUploadPromises = React.useRef(new Map<string, Promise<PrivateImageAttachment>>());
  privateImageAttachmentsRef.current = privateImageAttachments;

  const isImage = tool.kind === "image";
  const promptLimit = serverPromptLimit ?? (isImage ? GPT_IMAGE_PROMPT_MAX_CHARS : 24000);
  const promptTooLong = prompt.length > promptLimit;
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => { setIsMobile(query.matches); if (!query.matches) setMobileResultOpen(false); };
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const isWebsite = tool.kind === "website";
  const isAudio = tool.kind === "audio";
  const canAttachImages = isImage || isWebsite;
  const [brainReady, setBrainReady] = React.useState(false);
  const brainUserId = user?.id;
  const [useWorkspaceBrand, setUseWorkspaceBrand] = React.useState(false);
  React.useEffect(() => { setServerPromptLimit(null); }, [tool.id, selections.model, promptAttach?.id, useWorkspaceBrand, workspaceId]);
  // Temporarily down for technical reasons (distinct from "coming soon").
  const maintenance = Boolean(tool.maintenance);
  const functional = tool.functional && !maintenance;

  // Audio (maro Zo) is mode-based: the first setting is the mode selector and
  // each mode option carries flags for what inputs it needs.
  const modeOpt = isAudio
    ? findOption(tool.settings[0], selections[tool.settings[0].id] ?? tool.settings[0].default)
    : undefined;
  const needsAudioInput = Boolean(modeOpt?.inputAudio);
  const needsPrompt = isAudio ? !modeOpt?.noPrompt : true;
  const imageModels = useV1ImageModels(isImage ? tool.id : null);
  const selectedImageModel = imageModels.find((model) => model.key === selections.model && model.enabled) ?? imageModels.find((model) => model.isDefault && model.enabled);
  React.useEffect(() => {
    if (isImage && selections.model && imageModels.length && !imageModels.some((m) => m.key === selections.model && m.enabled)) {
      setSelections((current) => { const next = { ...current }; delete next.model; return next; });
    }
  }, [isImage, imageModels, selections.model]);
  const shownSettings = visibleSettings(tool, selections).map((setting) => isImage && setting.id === "model"
    ? { ...setting, default: imageModels.find((m) => m.isDefault)?.key ?? setting.default, options: imageModels.map((model) => ({
        id: model.key, label: model.label, hint: `${model.customerCredits} credits · ${model.descriptor}`, available: model.enabled,
      })) }
    : setting);

  React.useEffect(() => {
    setBrainReady(false);
    setUseWorkspaceBrand(false);
    if (!brainUserId || !workspaceId) {
      setBrainReady(false);
      setUseWorkspaceBrand(false);
      return;
    }
    let alive = true;
    void Promise.all([
      fetchBrainProfile(brainUserId, workspaceId),
      fetchWorkspaceSources(brainUserId, workspaceId),
    ]).then(([profile, sources]) => {
      if (!alive) return;
      const ready = isBrainConfigured(profile, sources.length);
      setBrainReady(ready);
    }).catch(() => {
      if (alive) setBrainReady(false);
    });
    return () => {
      alive = false;
    };
  }, [brainUserId, workspaceId]);

  React.useEffect(() => {
    if (!draftReady || !ready) return;
    // Reload when the tool changes (e.g. client-side nav between tools).
    const savedSelections = loadToolSelections(tool);
    setSelections(savedSelections);
    // Pull a prompt drafted on the Hub, if any.
    let draft = "";
    try {
      draft = sessionStorage.getItem("maro:hubdraft") || "";
      if (draft) sessionStorage.removeItem("maro:hubdraft");
    } catch {
      /* ignore */
    }
    // Pull a curated prompt attached from /prompts (only if it targets this tool).
    let attach: PromptAttach | null = null;
    try {
      const raw = sessionStorage.getItem(PROMPT_ATTACH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PromptAttach;
        if (parsed?.targetTool === tool.id && parsed.tool === presetToolFromTarget(tool.id)) attach = parsed;
        sessionStorage.removeItem(PROMPT_ATTACH_KEY);
      }
    } catch {
      /* ignore */
    }
    const presetConfig = attach?.config ?? { version: 1 as const };
    const nextSelections = attach
      ? { ...savedSelections, ...presetSelections(attach.tool, presetConfig) }
      : savedSelections;
    setSelections(nextSelections);
    if (attach) saveToolSelections(tool.id, nextSelections);
    if (draft || attach) setPrompt(draft || presetInitialPrompt(attach!.tool, presetConfig));
    if (attach) setPromptAttach(attach);
    saveLastTool(tool.id);

    // maroLogo → maroImazh keeps the already-private generation identity. The
    // signed URL is display-only and is never persisted as the reference.
    if (tool.kind === "image" && tool.id !== "logo") {
      try {
        const transferred = sessionStorage.getItem(IMAGE_REFERENCE_TRANSFER_KEY);
        if (transferred) {
          const parsed = JSON.parse(transferred) as { storageRef?: string; previewUrl?: string };
          if (parsed.storageRef?.startsWith("storage:generations/") && parsed.previewUrl) {
            const transferredAttachment: PrivateImageAttachment = {
              id: uid("att"),
              name: "maroLogo",
              storageRef: parsed.storageRef,
              previewUrl: parsed.previewUrl,
              status: "uploading",
            };
            setPrivateImageAttachments([transferredAttachment]);
            void uploadOrResolvePrivateAttachment(transferredAttachment).then((next) => {
              setPrivateImageAttachments((current) => current.map((item) => item.id === next.id ? next : item));
            }).catch(() => {
              setPrivateImageAttachments((current) => current.map((item) => item.id === transferredAttachment.id
                ? { ...item, status: "preview-error", error: "Pamja private nuk u hap. Provo përsëri." }
                : item));
            });
          }
          sessionStorage.removeItem(IMAGE_REFERENCE_TRANSFER_KEY);
        }
      } catch {
        sessionStorage.removeItem(IMAGE_REFERENCE_TRANSFER_KEY);
      }
    }

    // Remix from Explore — pre-fill prompt
    try {
      const remixRaw = sessionStorage.getItem("maro:remix");
      if (remixRaw) {
        const remix = JSON.parse(remixRaw) as { prompt?: string; toolId?: string; remixOf?: string };
        if (!remix.toolId || remix.toolId === tool.id) {
          if (remix.prompt) setPrompt(remix.prompt);
        }
        sessionStorage.removeItem("maro:remix");
      }
    } catch {
      /* ignore */
    }

    // Re-seed whenever the tool OR the ?open= target changes (clicking another
    // recent card while already on the same tool page).
  }, [tool, openId, setPromptAttach, setPrompt, setPrivateImageAttachments, draftReady, ready]);

  const restoredPreferences = React.useRef("");
  React.useEffect(() => {
    if (!draftReady || !conversationId || !history.length) return;
    const key = `${conversationScope}:${conversationId}`;
    const latest = history[history.length - 1];
    if (restoredPreferences.current === key || latest.toolId !== tool.id) return;
    restoredPreferences.current = key;
    if (latest.selections && Object.keys(latest.selections).length) setSelections({ ...defaultSelections(tool), ...latest.selections });
    setUseWorkspaceBrand(Boolean(latest.brain));
  }, [draftReady, history, conversationId, conversationScope, tool]);

  // Only scroll when the latest generation is added or changes status.
  const latestMessage = messages[messages.length - 1];
  React.useEffect(() => {
    if (!latestMessage) return;
    const frame = requestAnimationFrame(() => {
      const cards = scrollRef.current?.querySelectorAll<HTMLElement>("[data-generation-id]");
      const card = cards?.[cards.length - 1];
      const target = card?.querySelector<HTMLElement>("[data-generation-result]") ?? card;
      target?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [latestMessage?.id, latestMessage?.status]);

  const cost = isImage ? selectedImageModel?.customerCredits ?? 0 : toolSelectionCost(tool, selections, pricing.options);

  const setOption = (settingId: string, optionId: string) => {
    setSelections((prev) => {
      const next = { ...prev, [settingId]: optionId };
      saveToolSelections(tool.id, next);
      return next;
    });
  };

  const startPrivateAttachmentUpload = React.useCallback(
    (attachment: PrivateImageAttachment): Promise<PrivateImageAttachment> => {
      const existing = attachmentUploadPromises.current.get(attachment.id);
      if (existing) return existing;
      setPrivateImageAttachments((current) => current.map((item) => item.id === attachment.id
        ? { ...item, status: "uploading", error: undefined }
        : item));
      const promise = uploadOrResolvePrivateAttachment(attachment)
        .then((next) => {
          setPrivateImageAttachments((current) => current.map((item) => item.id === next.id ? next : item));
          return next;
        })
        .catch((error) => {
          const failed: PrivateImageAttachment = attachment.storageRef
            ? {
                ...attachment,
                status: "preview-error",
                error: "Pamja private nuk u hap. Provo përsëri.",
              }
            : {
                ...attachment,
                status: "upload-error",
                error: projectAssetErrorMessage(error),
              };
          setPrivateImageAttachments((current) => current.map((item) => item.id === failed.id ? failed : item));
          throw error;
        })
        .finally(() => attachmentUploadPromises.current.delete(attachment.id));
      attachmentUploadPromises.current.set(attachment.id, promise);
      return promise;
    },
    [setPrivateImageAttachments]
  );

  const queuePrivateImageFiles = React.useCallback(
    async (files: File[]) => {
      const currentCount = privateImageAttachmentsRef.current.length;
      const room = MAX_ATTACHMENTS - currentCount;
      if (room <= 0) {
        toast(`Maksimumi ${MAX_ATTACHMENTS} imazhe.`);
        return;
      }
      const accepted = files
        .filter((file) => {
          if (!/^image\/(?:png|jpe?g|webp)$/i.test(file.type)) {
            toast("Zgjidh një imazh PNG, JPG ose WebP.");
            return false;
          }
          if (file.size > MAX_IMAGE_REFERENCE_FILE_BYTES) {
            toast("Imazhi është shumë i madh (max 25MB)." );
            return false;
          }
          return true;
        })
        .slice(0, room);
      const queued = await Promise.all(accepted.map(async (file): Promise<PrivateImageAttachment> => {
        const localPreviewUrl = await readImageFile(file);
        return {
          id: uid("att"),
          name: file.name,
          previewUrl: localPreviewUrl,
          sourceFile: file,
          status: user ? "uploading" : "pending",
        };
      }));
      if (!queued.length) return;
      let admitted: PrivateImageAttachment[] = [];
      setPrivateImageAttachments((current) => {
        admitted = queued.slice(0, Math.max(0, MAX_ATTACHMENTS - current.length));
        return [...current, ...admitted];
      });
      if (user) {
        await Promise.allSettled(admitted.map((attachment) => startPrivateAttachmentUpload(attachment)));
      }
    },
    [startPrivateAttachmentUpload, toast, user, setPrivateImageAttachments]
  );

  const refreshPrivateAttachmentPreview = React.useCallback(async (id: string) => {
    const attachment = privateImageAttachmentsRef.current.find((item) => item.id === id);
    if (!attachment?.storageRef) return false;
    try {
      const next = await startPrivateAttachmentUpload({ ...attachment, status: "uploading" });
      return next.status === "ready";
    } catch {
      return false;
    }
  }, [startPrivateAttachmentUpload]);

  React.useEffect(() => {
    if (!user || !draftReady) return;
    for (const attachment of privateImageAttachmentsRef.current) {
      if (attachment.status === "pending" && (attachment.sourceFile || attachment.storageRef)) {
        void startPrivateAttachmentUpload(attachment).catch(() => undefined);
      }
    }
  }, [startPrivateAttachmentUpload, user, draftReady, privateImageAttachments]);

  const addImageUrl = React.useCallback(
    async (url: string) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) {
          toast("Format i pavlefshëm.");
          return;
        }
        if (!/^image\/(?:png|jpe?g|webp)$/i.test(blob.type)) {
          toast("Zgjidh një imazh PNG, JPG ose WebP.");
          return;
        }
        const maxBytes = isWebsite ? MAX_PROJECT_ASSET_FILE_BYTES : MAX_IMAGE_REFERENCE_FILE_BYTES;
        if (blob.size > maxBytes) {
          toast(`Imazhi është shumë i madh (max ${isWebsite ? 5 : 25}MB).`);
          return;
        }
        if (isImage) {
          const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
          await queuePrivateImageFiles([new File([blob], `reference.${extension}`, { type: blob.type })]);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((a) => {
            if (a.length >= MAX_ATTACHMENTS) {
              toast(`Maksimumi ${MAX_ATTACHMENTS} imazhe.`);
              return a;
            }
            return [...a, reader.result as string];
          });
        };
        reader.readAsDataURL(blob);
      } catch {
        toast("S'munda ta ngarkoj imazhin.");
      }
    },
    [isImage, isWebsite, queuePrivateImageFiles, toast, setAttachments]
  );

  const addImageFiles = React.useCallback(
    (files: File[]) => {
      if (isImage) {
        void queuePrivateImageFiles(files);
        return;
      }
      if (files.some((file) => !/^image\/(?:png|jpe?g|webp)$/i.test(file.type))) {
        toast("Zgjidh një imazh PNG, JPG ose WebP.");
      }
      setAttachments((current) => {
        const room = MAX_ATTACHMENTS - current.length;
        if (room <= 0) {
          toast(`Maksimumi ${MAX_ATTACHMENTS} imazhe.`);
          return current;
        }
        files
          .filter(
            (f) =>
              /^image\/(?:png|jpe?g|webp)$/i.test(f.type)
          )
          .slice(0, room)
          .forEach((f) => {
            const maxBytes = isWebsite ? MAX_PROJECT_ASSET_FILE_BYTES : MAX_IMAGE_REFERENCE_FILE_BYTES;
            if (f.size > maxBytes) {
              toast(`Imazhi është shumë i madh (max ${isWebsite ? 5 : 25}MB).`);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => setAttachments((a) => [...a, reader.result as string].slice(0, MAX_ATTACHMENTS));
            reader.readAsDataURL(f);
          });
        return current;
      });
    },
    [isImage, isWebsite, queuePrivateImageFiles, toast, setAttachments]
  );

  const selectLibraryAssets = (assets: LibrarySelection[]) => {
    if (isImage) {
      setPrivateImageAttachments(current => [...current, ...assets.filter(asset => !current.some(item => item.storageRef === asset.storageRef)).map(asset => ({ id: uid("att"), name: asset.name, storageRef: asset.storageRef, previewUrl: asset.url, status: "ready" as const }))].slice(0, MAX_ATTACHMENTS));
    } else {
      setAttachments(current => [...new Set([...current, ...assets.map(asset => asset.storageRef)])].slice(0, MAX_ATTACHMENTS));
      setWebPreviews(current => ({ ...current, ...Object.fromEntries(assets.map(asset => [asset.storageRef, asset.url])) }));
    }
  };
  React.useEffect(() => {
    if (!isWebsite || !draftReady || !user) return;
    const refs = attachments.filter(value => value.startsWith("storage:generations/"));
    if (!refs.length) return;
    let alive = true;
    void resolvePrivateAssetRefsStrict(refs).then(urls => { if (alive) setWebPreviews(urls); }).catch(() => { if (alive) toast("Pamjet e aseteve nuk u hapën. Provo përsëri."); });
    return () => { alive = false; };
  }, [attachments, isWebsite, draftReady, user, toast]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    addImageFiles(Array.from(files));
  };

  // Paste an image straight from the clipboard (Ctrl/Cmd+V) into attachments.
  const onPasteImages = (e: React.ClipboardEvent) => {
    if (!canAttachImages || !functional) return;
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => Boolean(f));
    if (files.length) {
      e.preventDefault();
      addImageFiles(files);
    }
  };

  const pickAudio = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) {
      toast("Zgjidh një skedar audio.");
      return;
    }
    if (f.size > MAX_AUDIO_BYTES) {
      toast("Audio është shumë e madhe (max 12MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAudioInput({ url: reader.result as string, name: f.name });
    reader.readAsDataURL(f);
  };

  const doGenerateAudio = React.useCallback(async () => {
    const text = prompt.trim();
    if (needsPrompt && (!text || promptTooLong)) return;
    if (needsAudioInput && !audioInput) return;

    const mode = selections[tool.settings[0].id] ?? tool.settings[0].default;
    const label = modeOpt?.label ?? tool.name;
    const userText = needsPrompt ? text : `[${label}]`;
    const sentAudio = audioInput?.url;
    const maroId = uid("g");
    const now = new Date().toISOString();
    const isTextMode = mode === "stt";
    setMessages((m) => [
      ...m,
      {
        id: maroId,
        role: "generation",
        text: userText,
        createdAt: now,
        status: "thinking",
        mediaType: isTextMode ? "text" : "audio",
      },
    ]);
    setPrompt("");
    setAudioInput(null);
    setLoading(true);
    setMobileComposerOpen(false);
    setMobileResultOpen(true);
    try {
      const res = await generateAudio({
        toolId: tool.id as "zo",
        mode,
        prompt: needsPrompt ? text : undefined,
        audio: sentAudio,
        selections,
        workspaceId,
      });
      spendCredits(res.creditsSpent || cost);
      const isText = typeof res.text === "string";
      const creation: ImageCreation = {
        id: uid("aud"),
        workspaceId,
        toolId: tool.id,
        prompt: userText,
        urls: res.audioUrl ? [res.audioUrl] : [],
        mediaType: isText ? "text" : "audio",
        text: isText ? res.text : undefined,
        title: isText ? (res.text || "").slice(0, 60) : text.slice(0, 60) || label,
        createdAt: now,
      };
      addCreation(creation);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === maroId
            ? {
                ...msg,
                status: "done",
                creation,
                mediaType: creation.mediaType,
              }
            : msg
        )
      );
    } catch (err) {
      let errMsg = "Gabim i papritur. Provo përsëri.";
      if (err instanceof InsufficientCreditsError) {
        setShowBuy(true);
        errMsg = "Nuk ke kredite të mjaftueshme.";
      } else if (err instanceof AudioGenerationError) {
        errMsg = AUDIO_ERRORS[err.code] || `Gabim gjenerimi (${err.code}).`;
        toast(errMsg);
      } else {
        toast(errMsg);
      }
      setMessages((m) =>
        m.map((msg) =>
          msg.id === maroId ? { ...msg, status: "error", error: errMsg } : msg
        )
      );
    } finally {
      setLoading(false);
    }
  }, [setPrompt, setAudioInput, promptTooLong, prompt, needsPrompt, needsAudioInput, audioInput, selections, tool, modeOpt, cost, spendCredits, addCreation, toast, workspaceId]);

  const doGenerate = React.useCallback(async () => {
    if (tool.kind === "audio") {
      await doGenerateAudio();
      return;
    }
    const text = prompt.trim();
    if (!text || promptTooLong) return;
    try { localStorage.setItem(conversationScope, conversationId); } catch { /* Keep the current conversation in memory. */ }
    if (tool.kind === "image" && !requestedConversation) router.replace(`${tool.route}?chat=${encodeURIComponent(conversationId)}`, { scroll: false });

    const fortPayload = undefined;
    const maroPromptPayload = promptAttach ? { id: promptAttach.id } : undefined;

    if (tool.kind === "website") {
      const kind = (TYPE_TO_KIND[selections.type] ?? "business") as WebsiteKind;
      const speed = SPEED_TO_LEGACY[selections.speed] ?? "fast";
      setLoading(true);
      try {
        const referenceImages = attachments.length
          ? await Promise.all(attachments.map((value) => value.startsWith("storage:generations/") ? value : uploadProjectAssetDataUrl(value)))
          : undefined;
        const project = createProjectFromComposer({
          prompt: text,
          websiteType: kind,
          speed,
          selections,
          fort: fortPayload,
          maroPromptId: promptAttach?.id,
          workspaceId,
          referenceImages,
          brain: brainReady && useWorkspaceBrand,
        });
        addProject(project);
        setPrompt("");
        setAttachments([]);
        router.push(`/projects/${project.id}/generating`);
      } catch (error) {
        toast(projectAssetErrorMessage(error));
        setLoading(false);
      }
      return;
    }

    const sentPrivateAttachments = privateImageAttachments.length ? [...privateImageAttachments] : undefined;
    const sentAttachments = sentPrivateAttachments?.map((attachment) => attachment.previewUrl);
    const maroId = uid("g");
    const now = new Date().toISOString();
    const labels = resolveGenerationLabels(tool, selections);
    setMessages((m) => [
      ...m,
      {
        id: maroId,
        role: "generation",
        text,
        attachments: sentAttachments,
        fort: Boolean(fortPayload),
        brain: brainReady && useWorkspaceBrand,
        promptCode: promptAttach?.code,
        format: labels.format,
        size: labels.size,
        formatLabel: labels.formatLabel,
        modelLabel: selectedImageModel?.label ?? labels.modelLabel,
        speedLabel: labels.speedLabel,
        createdAt: now,
        status: "thinking",
        mediaType: "image",
      },
    ]);
    const onStarted = createImageDraftAcceptance({
      prompt, attachments: sentPrivateAttachments ?? [], setPrompt,
      setAttachments: setPrivateImageAttachments,
    });
    setLoading(true);
    setMobileComposerOpen(false);
    setMobileResultOpen(true);
    try {
      setUploadingReferences(Boolean(sentAttachments?.length));
      const canonicalAttachments = sentPrivateAttachments?.length
        ? [...new Set(await Promise.all(sentPrivateAttachments.map(async (attachment) => {
            if (attachment.storageRef) return attachment.storageRef;
            const uploaded = await startPrivateAttachmentUpload(attachment);
            if (!uploaded.storageRef) throw new Error("upload-failed");
            return uploaded.storageRef;
          })))]
        : lastOutputRef ? [lastOutputRef] : undefined;
      setUploadingReferences(false);
      const res = await generateImages({
        toolId: tool.id as "logo" | "reklama",
        prompt: text,
        selections: tool.id === "logo" && logoWizard ? buildGenerationSelections(logoWizard) : selections,
        logoWizard: tool.id === "logo" && logoWizard ? structuredClone(logoWizard) : undefined,
        revision: tool.id === "logo" ? text : undefined,
        conversationId,
        quality: "high",
        attachments: canonicalAttachments,
        fort: fortPayload,
        maroPrompt: maroPromptPayload,
        workspaceId: workspaceId === LOCAL_WORKSPACE_SCOPE ? undefined : workspaceId,
        useWorkspaceBrand: brainReady && useWorkspaceBrand,
      }, { onStarted });
      spendCredits(res.creditsSpent || cost);
      const creation: ImageCreation = {
        id: res.generationId ?? uid("img"),
        serverId: res.generationId,
        storageRefs: res.storageRefs,
        workspaceId,
        conversationId,
        selections,
        inputRefs: canonicalAttachments,
        inputUrls: sentAttachments,
        logoWizard: tool.id === "logo" && logoWizard ? structuredClone(logoWizard) : undefined,
        toolId: tool.id,
        prompt: text,
        urls: res.images,
        format: labels.format,
        size: labels.size,
        formatLabel: labels.formatLabel,
        modelLabel: selectedImageModel?.label ?? labels.modelLabel,
        speedLabel: labels.speedLabel,
        fort: Boolean(fortPayload),
        brain: brainReady && useWorkspaceBrand,
        promptCode: promptAttach?.code,
        createdAt: now,
      };
      addCreation(creation);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === maroId ? { ...msg, status: "done", creation } : msg
        )
      );
    } catch (err) {
      let errMsg = "Gabim i papritur. Provo përsëri.";
      if (err instanceof InsufficientCreditsError) {
        setShowBuy(true);
        errMsg = "Nuk ke kredite të mjaftueshme.";
      } else if (err instanceof ImageGenerationError) {
        if (err.code === "prompt_too_long") {
          const d = err.diagnostics;
          const limit = d.maxUserPromptLength ?? (d.maxCompiledPromptLength !== undefined && d.compiledPromptLength !== undefined && d.userPromptLength !== undefined
            ? Math.max(0, d.userPromptLength - (d.compiledPromptLength - d.maxCompiledPromptLength)) : null);
          if (limit !== null) setServerPromptLimit(limit);
        }
        errMsg = imageErrorMessage(err.code, IMG_ERRORS);
        toast(errMsg);
      } else {
        errMsg = projectAssetErrorMessage(err);
        toast(errMsg);
      }
      setMessages((m) =>
        m.map((msg) =>
          msg.id === maroId ? { ...msg, status: "error", error: errMsg } : msg
        )
      );
    } finally {
      setUploadingReferences(false);
      setLoading(false);
    }
  }, [setPrompt, setAttachments, setPrivateImageAttachments, promptTooLong, prompt, tool, selections, attachments, privateImageAttachments, cost, promptAttach, addProject, router, spendCredits, addCreation, toast, doGenerateAudio, workspaceId, brainReady, useWorkspaceBrand, startPrivateAttachmentUpload, selectedImageModel, conversationId, conversationScope, logoWizard, lastOutputRef, requestedConversation]);

  // Whether the current inputs are enough to generate.
  const canGenerate = ready && draftReady && !recoveredPending && !historyError && (!isImage || !user || serverHistory.scope === `${conversationScope}:${conversationId}`) && !promptTooLong && (isAudio
    ? (needsAudioInput ? Boolean(audioInput) : Boolean(prompt.trim()))
    : Boolean(prompt.trim()) && (!isImage || Boolean(selectedImageModel)) && (
        !isImage ||
        !user ||
        privateImageAttachments.every((attachment) => Boolean(attachment.storageRef))
      ));

  const onGenerate = () => {
    if (!functional) {
      toast(maintenance ? `${tool.name} është në mirëmbajtje.` : `${tool.name} vjen së shpejti.`);
      return;
    }
    if (!canGenerate || loading) return;
    if (tool.id === "logo" && !logoWizard) {
      const latest = history[history.length - 1];
      if (latest?.storageRefs?.[0]) sessionStorage.setItem(IMAGE_REFERENCE_TRANSFER_KEY, JSON.stringify({ storageRef: latest.storageRefs[0], previewUrl: latest.urls[0] }));
      saveComposerDraft(composerDraftKey(user?.id, workspaceId, `reklama:${conversationId}`), { ...emptyComposerDraft(), prompt });
      router.push(`/imazh?chat=${encodeURIComponent(conversationId)}`);
      return;
    }
    if (!user) {
      pendingAuthDraft.current = { id: conversationId, draft: currentComposerDraft(draftKey) };
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
  };
  React.useEffect(() => {
    if (!pendingRef.current || !user || !canGenerate || showAuth) return;
    pendingRef.current = false;
    generateButtonRef.current?.click();
  }, [user, canGenerate, showAuth]);

  const audioPlaceholder = (() => {
    const mode = selections[isAudio ? tool.settings[0].id : ""] ?? "tts";
    if (mode === "sts") return "Ngarko audio dhe zgjidh zërin e ri…";
    if (mode === "isolate") return "Ngarko audio për të pastruar zhurmën…";
    if (mode === "stt") return "Ngarko audio për ta kthyer në tekst…";
    return `Shkruje…`;
  })();

  const placeholder =
    tool.id === "prompte"
      ? "Prompte gati për t'u përdorur. Së shpejti…"
      : isAudio
      ? audioPlaceholder
      : `Menoje edhe shkruje cka po don, ${tool.name} ta bon.`;

  const dndEnabled = canAttachImages && functional;
  const hasFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes("Files");
  const hasUrlDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes(MARO_IMAGE_URL_MIME);
  const hasPresetDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes(MARO_PRESET_MIME);

  const onDragEnter = (e: React.DragEvent) => {
    if (!dndEnabled) return;
    if (!hasFileDrag(e) && !hasUrlDrag(e) && !hasPresetDrag(e)) return;
    dragDepth.current += 1;
    setDragOver(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (!dndEnabled) return;
    if (hasFileDrag(e) || hasUrlDrag(e) || hasPresetDrag(e)) e.preventDefault();
  };
  const onDragLeave = () => {
    if (!dndEnabled) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const onDropFiles = (e: React.DragEvent) => {
    if (!dndEnabled) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    const dropped = readInspirationDrop(e.dataTransfer, tool.id);
    if (dropped?.kind === "preset") {
      const parsed = dropped.attach;
      if (parsed) {
        setPromptAttach(parsed);
        void fetchPromptDetail(parsed.id).then((detail) => {
          if (detail.target_tool !== tool.id || detail.tool !== parsed.tool) return;
          setPromptAttach({ ...parsed, title: detail.title, config: detail.config });
        }).catch(() => undefined);
      }
      return;
    }
    if (dropped?.kind === "image") {
      void addImageUrl(dropped.url);
      return;
    }
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) addImageFiles(files);
  };

  const isGallery = layout === "gallery" && isImage && !requestedConversation && !openId && messages.length === 0 && recoveredJobs.length === 0;
  const showLandingHeader = Boolean(headerSlot) && !openId && !requestedConversation && messages.length === 0;

  return (
    <div
      className="relative flex h-full max-lg:h-auto flex-col overflow-x-clip"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDropFiles}
    >
      {/* Full-page drop overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-canvas"
          >
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-10 py-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-ink">
                <ImagePlus className="h-7 w-7" />
              </span>
              <div className="text-[16px] font-bold text-ink">Lësho për ta bashkëngjitur</div>
              <div className="text-[13px] text-ink-3">Deri në {MAX_ATTACHMENTS} imazhe</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll area — ChatGPT-style conversation for image tools, plus the
          maroFort expert panel (when enabled). */}
      <div
        ref={scrollRef}
        className={cn(
          "scroll-thin min-h-0 flex-1 overflow-x-clip overflow-y-auto max-lg:pb-24 max-lg:flex-none max-lg:overflow-y-visible lg:overflow-y-auto",
          isReadOnlyView && "pb-10"
        )}
      >
        <div
          className={cn(
            "mx-auto w-full px-4 pb-6 pt-6 sm:px-5",
            isGallery ? "max-w-[var(--layout-module-max)] sm:pt-8" : "max-w-[var(--layout-composer-max)] sm:max-w-[var(--layout-composer-max)] sm:pt-12"
          )}
        >
          {showLandingHeader && headerSlot}
          {historyError && <p role="alert" className="mb-4 text-sm text-ink-2">Biseda nuk u ngarkua. <button type="button" className="underline" onClick={() => setHistoryRefresh(value => value + 1)}>Provo përsëri</button></p>}
          {(requestedConversation || history.length > 0 || recoveredJobs.length > 0) && <div className="mb-4 flex items-center justify-between gap-3"><span className="text-sm text-ink-3">Biseda · {history.length} gjenerime</span><Button size="sm" variant="secondary" disabled={loading || recoveredPending} onClick={() => {
            const id = crypto.randomUUID();
            try { localStorage.setItem(conversationScope, id); } catch { /* Ignore unavailable browser storage. */ }
            router.push(`${tool.route}?chat=${id}`);
          }}>Chat i ri</Button></div>}

          {!showLandingHeader && !headerSlot && maintenance ? (
            <MaintenanceHero tool={tool} />
          ) : (
            !showLandingHeader && !headerSlot && !functional && <ComingSoonHero tool={tool} />
          )}

          {functional && isGallery && (isImage || isAudio) && messages.length > 0 && (
            <GalleryMasonry messages={messages} onOpen={(c) => setLightbox(c)} />
          )}

          {functional && !isGallery && (isImage || isAudio) && messages.length > 0 && (
            <div className="mb-4 flex flex-col gap-8">
              {messages.map((m) => (
                <GenerationCard key={m.id} message={m} onOpen={(c) => setLightbox(c)} />
              ))}
            </div>
          )}
          {!loading && !messages.some(message => message.status !== "done") && recoveredJobs.map(job => <GenerationCard key={job.id} message={{ id: job.id, text: job.prompt, status: job.status, createdAt: job.createdAt, mediaType: "image", error: job.status === "error" ? "Gjenerimi nuk u përfundua. Mund të provosh përsëri." : undefined }} />)}

        </div>
      </div>

      {!isReadOnlyView && (
      <div className="relative z-20 shrink-0 bg-canvas max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" className="mx-4 my-2 flex w-[calc(100%-2rem)] items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left text-ink shadow-float lg:hidden" aria-expanded={mobileComposerOpen} aria-controls="mobile-composer-content" onClick={() => setMobileComposerOpen((value) => !value)}>
          <span className="min-w-0 truncate text-sm font-semibold">{mobileComposerOpen ? "Mbyll promptbox" : prompt || "Shkruaj idenë tënde…"}</span>
          <ChevronDown className={cn("h-5 w-5 shrink-0", !mobileComposerOpen && "rotate-180")} />
        </button>
        <div id="mobile-composer-content" className={cn(!mobileComposerOpen && "max-lg:hidden", "max-lg:max-h-[60dvh] max-lg:overflow-y-auto")}>
        <div className="mx-auto w-full max-w-[var(--layout-promptbox-max)] px-4 pb-4 pt-2 lg:pb-6">
          <PlatformNotices placement="promptbox" moduleId={noticeModuleId(tool.id)} />

          {(isImage ? privateImageAttachments.length : attachments.length) > 0 && (
            <div className="mb-2.5">
            <div className="flex flex-wrap gap-2">
              {(isImage ? privateImageAttachments : attachments.map((previewUrl, index) => ({
                id: `legacy-${index}`,
                name: "",
                previewUrl: webPreviews[previewUrl] ?? previewUrl,
                status: "ready" as const,
              }))).map((attachment, i) => (
                <div key={attachment.id} className="relative h-16 w-16 overflow-hidden rounded-xl bg-surface-2">
                  {isImage ? (
                    <StableImage
                      src={attachment.previewUrl}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                      refreshKey={("storageRef" in attachment ? attachment.storageRef : undefined) ?? attachment.id}
                      onRefresh={("storageRef" in attachment && attachment.storageRef)
                        ? () => refreshPrivateAttachmentPreview(attachment.id)
                        : undefined}
                      onTerminalError={() => setPrivateImageAttachments((current) => current.map((item) =>
                        item.id === attachment.id
                          ? { ...item, status: "decode-error", error: "Imazhi u ngarkua, por nuk mund të shfaqet." }
                          : item
                      ))}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachment.previewUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  {isImage && attachment.status === "uploading" && (
                    <span className="absolute inset-0 grid place-items-center bg-scrim/45 text-on-scrim" aria-label="Duke ngarkuar">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </span>
                  )}
                  {isImage && (attachment.status === "upload-error" || attachment.status === "preview-error" || attachment.status === "decode-error") && (
                    <button
                      type="button"
                      onClick={() => {
                        if (attachment.storageRef) void refreshPrivateAttachmentPreview(attachment.id);
                        else void startPrivateAttachmentUpload(attachment).catch(() => undefined);
                      }}
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-scrim/80 px-1 py-1 text-[9px] font-semibold text-on-scrim"
                      title={attachment.error}
                    >
                      <RefreshCw className="h-2.5 w-2.5" /> Provo përsëri
                    </button>
                  )}
                  <button
                    onClick={() => isImage
                      ? setPrivateImageAttachments((current) => current.filter((item) => item.id !== attachment.id))
                      : setAttachments((a) => a.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-scrim text-on-scrim"
                    aria-label="Hiq"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {isImage && privateImageAttachments.some((attachment) => attachment.error) && (
              <div className="mt-1.5 space-y-1 text-[11.5px] text-danger" role="alert">
                {privateImageAttachments.filter((attachment) => attachment.error).map((attachment) => (
                  <div key={`${attachment.id}-error`}>
                    {attachment.status === "upload-error"
                      ? `Ngarkimi dështoi: ${attachment.error}`
                      : attachment.status === "preview-error"
                        ? `Imazhi u ngarkua, por pamja private nuk u hap. Provo përsëri.`
                        : `Imazhi u ngarkua, por nuk mund të shfaqet. Provo përsëri.`}
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {uploadingReferences && (
            <div className="mb-2 text-[12.5px] font-medium text-ink-3">Duke ngarkuar referencat privatisht…</div>
          )}

          {isAudio && needsAudioInput && audioInput && (
            <div className="mb-2.5 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <AudioLines className="h-4 w-4 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{audioInput.name}</span>
              <button
                onClick={() => setAudioInput(null)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-line hover:text-ink"
                aria-label="Hiq audion"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {(promptAttach || (canAttachImages && brainReady)) && !loading && (
            <div className="prompt-accessory-row mb-2.5 flex flex-wrap items-center gap-2.5">
              {canAttachImages && brainReady && <BrainPill active={useWorkspaceBrand} onToggle={setUseWorkspaceBrand} />}
              {promptAttach && (
                <PresetPill
                  code={promptAttach.code}
                  thumbnailUrl={promptAttach.thumbnailUrl}
                  module={promptAttach.tool}
                  onRemove={() => setPromptAttach(null)}
                />
              )}
            </div>
          )}

          <div className="maro-composer">
            {/* Text row */}
            <div className="relative">
              {needsPrompt ? (
                <textarea
                  aria-label="Prompti"
                  aria-describedby={promptCountId}
                  aria-invalid={promptTooLong}
                  value={prompt}
                  disabled={!draftReady || !ready}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      if (!e.repeat) generateButtonRef.current?.click();
                    }
                  }}
                  onPaste={onPasteImages}
                  rows={3}
                  placeholder={placeholder}
                  className="maro-composer__input block h-[4.5rem] max-h-36 min-h-[4.5rem] w-full resize-none pl-2 pr-12 pt-1 text-[16px] leading-relaxed placeholder:text-ink-3"
                />
              ) : (
                <div className="flex min-h-[4.5rem] items-center pl-2 pr-12 pt-1 text-[16px] text-ink-3">
                  {audioInput ? "Audio gati. Kliko gjenero." : audioPlaceholder}
                </div>
              )}
              {needsPrompt && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  disabled={!draftReady || !ready}
                  className="absolute right-0 top-0 grid h-9 w-9 place-items-center rounded-maro12 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none"
                  aria-label="Zgjero promptin"
                >
                  <MaroIcon name="fullscreen" fallback={Maximize2} className="h-5 w-5" />
                </button>
              )}
            </div>

            {needsPrompt && <p id={promptCountId} className={cn("px-2 text-[12px]", prompt.length < promptLimit * 0.9 && "sr-only", promptTooLong ? "font-semibold text-danger" : "text-ink-3")}>
              {prompt.length.toLocaleString("en-US")} / {promptLimit.toLocaleString("en-US")} shkronja
              {promptTooLong && ` · Fshi edhe ${(prompt.length - promptLimit).toLocaleString("en-US")} shkronja për të gjeneruar.`}
            </p>}
            {/* Toolbar */}
            <div className="dock-toolbar">
              <div className="dock-toolbar-controls">
              {canAttachImages && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={isWebsite ? "image/png,image/jpeg,image/webp" : "image/*"}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <IconBtn
                    onClick={() => setAttachmentPickerOpen(true)}
                    disabled={!draftReady || !ready || (isImage ? privateImageAttachments.length : attachments.length) >= MAX_ATTACHMENTS}
                    label="Bashkëngjit imazh"
                  >
                    <MaroIcon name="attach" fallback={Paperclip} className="h-5 w-5" />
                  </IconBtn>
                </>
              )}
              {isAudio && needsAudioInput && (
                <>
                  <input
                    ref={audioFileRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      pickAudio(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <IconBtn onClick={() => audioFileRef.current?.click()} label="Ngarko audio">
                    <Mic className="h-5 w-5" />
                  </IconBtn>
                </>
              )}

              <ToolSwitcher
                currentId={tool.id}
                tools={isImage ? IMAGE_TOOLS : MAIN_TOOLS}
                onNavigate={(route) => router.push(route)}
              />

              {shownSettings.map((s) =>
                s.toggle ? (
                  <ToggleSetting
                    key={s.id}
                    setting={s}
                    value={selections[s.id] ?? s.default}
                    onChange={(optId) => setOption(s.id, optId)}
                  />
                ) : (
                  <SettingSelect
                    key={s.id}
                    toolId={tool.id}
                    setting={s}
                    value={selections[s.id] ?? s.default}
                    optionIcons={toolOptionIcons}
                    onChange={(optId, opt) => {
                      if (opt.confirm) {
                        setConfirmOpt({ settingId: s.id, optionId: optId, message: opt.confirm });
                      } else {
                        setOption(s.id, optId);
                      }
                    }}
                  />
                )
              )}

              </div>

              <div className="dock-toolbar-actions">
                <GenerateButton
                  ref={generateButtonRef}
                  loading={loading}
                  onCommit={onGenerate}
                  cost={functional && (!isImage || selectedImageModel) ? cost : undefined}
                  cancelKey={JSON.stringify([conversationUserId, conversationId, tool.id, workspaceId, prompt, selections, cost, credits, privateImageAttachments.map(item => item.id), attachments, audioInput?.name])}
                  disabled={functional && (!canGenerate || loading)}
                />
              </div>
            </div>
          </div>
          {maintenance ? (
            <p className="mt-2 text-center text-[12.5px] text-ink-3">
              {tool.name} është përkohësisht në mirëmbajtje. Po e rregullojmë për një eksperiencë më
              të mirë.
            </p>
          ) : !functional ? (
            <p className="mt-2 text-center text-[12.5px] text-ink-3">
              {tool.name} vjen së shpejti. Provoje interfejsin, gjenerimi aktivizohet së afërmi.
            </p>
          ) : (
            <p className="mt-3 text-center text-[13px] text-ink-3">kush punon gabon, edhe maro gabon</p>
          )}
        </div>
        </div>
      </div>
      )}

      <Modal open={showAuth} onClose={() => { pendingRef.current = false; pendingAuthDraft.current = null; setShowAuth(false); }} size="sm">
        <ModalHeader
          icon={<Sparkles className="h-5 w-5" />}
          title="Hyr për të gjeneruar"
          description="Krijo llogari ose hyr, pastaj vazhdon menjëherë."
        />
        <div className="px-6 pb-6">
          <AuthPanel onDone={onAuthDone} />
        </div>
      </Modal>

      <AttachmentPicker open={attachmentPickerOpen} onClose={() => setAttachmentPickerOpen(false)} onUpload={() => fileRef.current?.click()} limit={MAX_ATTACHMENTS - (isImage ? privateImageAttachments.length : attachments.length)} excludeRefs={isImage ? privateImageAttachments.flatMap(item => item.storageRef ? [item.storageRef] : []) : attachments} onSelect={selectLibraryAssets} />
      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />

      <Modal open={confirmOpt !== null} onClose={() => setConfirmOpt(null)} size="sm">
        <ModalHeader icon={<Sparkles className="h-5 w-5" />} title="Je i sigurt?" description={confirmOpt?.message} />
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={() => setConfirmOpt(null)}
            className="flex-1 rounded-xl bg-surface px-4 py-3 text-[14px] font-semibold text-ink hover:bg-surface-2"
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

      <Modal open={isMobile && mobileResultOpen && Boolean(latestMessage)} onClose={() => setMobileResultOpen(false)} className="mobile-generation-dialog !bg-surface !text-ink" hideClose>
        <div className="sticky top-0 z-20 flex items-center justify-between bg-surface px-5 py-3 text-ink">
          <h2 className="font-bold">{loading ? "Po gjenerohet…" : "Gjenerimi yt"}</h2>
          <button type="button" autoFocus onClick={() => setMobileResultOpen(false)} aria-label="Mbyll gjenerimin" className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-ink"><X className="h-6 w-6" /></button>
        </div>
        {latestMessage && <div className="px-4 pb-6"><GenerationCard message={latestMessage} onOpen={(creation) => { setMobileResultOpen(false); setLightbox(creation); }} /></div>}
      </Modal>

      <PromptExpand
        open={expanded}
        value={prompt}
        maxChars={promptLimit}
        canSubmit={canGenerate && !loading}
        onChange={setPrompt}
        onClose={() => setExpanded(false)}
        onSubmit={() => {
          setExpanded(false);
          generateButtonRef.current?.click();
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
      className="maro-dock-icon-btn focus:outline-none"
    >
      {children}
    </button>
  );
}

// ---- Tool switcher pill (135px, green) — navigates between tools ----
function ToolSwitcher({
  currentId,
  tools,
  onNavigate,
}: {
  currentId: string;
  tools: ToolDef[];
  onNavigate: (route: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ bottom: number; left: number; width: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const current = getTool(currentId);
  useMenuKeyboard(open && Boolean(pos), menuRef, btnRef, () => setOpen(false));

  const place = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(256, window.innerWidth - 16);
    setPos({ bottom: window.innerHeight - r.top + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = () => place();
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  if (!current) return null;

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="maro-dock-pill"
        data-variant="accent"
      >
        <ToolIcon toolId={current.id} fallback={current.icon} className="h-5 w-5 shrink-0" />
        <span className="maro-dock-pill__label">{current.name}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                style={{ position: "fixed", bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: `calc(100dvh - ${pos.bottom + 8}px)`, zIndex: "var(--maro-z-dropdown)" }}
                className="maro-menu overflow-y-auto p-2" role="menu"
              >
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">Ndrysho tool</div>
                {tools.map((t) => {
                  const locked = !t.functional;
                  const active = t.id === currentId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (locked) return;
                        onNavigate(t.route);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none",
                        locked ? "cursor-not-allowed opacity-55" : active ? "bg-surface-2" : "hover:bg-surface-2"
                      )}
                    >
                      <ToolIcon toolId={t.id} fallback={t.icon} className="h-5 w-5 shrink-0" />
                      <span className={cn("flex-1 text-[14px] font-semibold", active ? "text-accent-teal" : "text-ink")}>
                        {t.name}
                      </span>
                      {locked && <Lock className="h-3.5 w-3.5 text-ink-3" />}
                      {active && !locked && <Check className="h-4 w-4 text-accent-teal" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

// ---- Toggle setting (renders a Switch; second option id == "on") ----
function ToggleSetting({
  setting,
  value,
  onChange,
}: {
  setting: ToolSetting;
  value: string;
  onChange: (optionId: string) => void;
}) {
  const offId = setting.options[0]?.id ?? "off";
  const onId = setting.options[1]?.id ?? "on";
  const checked = value === onId;
  const Icon = setting.icon;
  return (
    <div className="maro-dock-pill shrink-0">
      <Icon className="h-5 w-5 shrink-0 opacity-70" />
      <span>{setting.label}</span>
      <Switch
        size="sm"
        checked={checked}
        onChange={(next) => onChange(next ? onId : offId)}
        aria-label={setting.label}
      />
    </div>
  );
}

// ---- Setting selector (icon + current value; options with coming-soon) ----
function SettingSelect({
  toolId,
  setting,
  value,
  optionIcons,
  onChange,
}: {
  toolId: string;
  setting: ToolSetting;
  value: string;
  optionIcons?: ToolOptionIcons;
  onChange: (optionId: string, opt: NonNullable<ReturnType<typeof findOption>>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ bottom: number; left: number; width: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const current = findOption(setting, value) ?? setting.options[0];
  const Icon = setting.icon;
  const currentId = current?.id ?? value;
  useMenuKeyboard(open && Boolean(pos), menuRef, btnRef, () => setOpen(false));
  const compactLabel = setting.id === "format"
    ? ({ "ig-post": "4:5", "ig-story": "9:16", "fb-post": "1:1", "yt-thumb": "16:9" } as Record<string, string>)[currentId] ?? current?.label
    : current?.label;

  const place = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(256, window.innerWidth - 16);
    setPos({ bottom: window.innerHeight - r.top + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = () => place();
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-haspopup="menu" className="maro-dock-pill max-w-none shrink-0"
        title={setting.label}
      >
        <OptionIcon
          toolId={toolId}
          settingId={setting.id}
          optionId={currentId}
          icons={optionIcons}
          fallback={Icon}
          className="h-5 w-5 shrink-0"
        />
        <span className="maro-dock-pill__label">{compactLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                style={{ position: "fixed", bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: `calc(100dvh - ${pos.bottom + 8}px)`, zIndex: "var(--maro-z-dropdown)" }}
                className="maro-menu overflow-y-auto p-2" role="menu"
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
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none",
                        disabled ? "cursor-not-allowed opacity-55" : active ? "bg-surface-2" : "hover:bg-surface-2"
                      )}
                    >
                      <OptionIcon
                        toolId={toolId}
                        settingId={setting.id}
                        optionId={o.id}
                        icons={optionIcons}
                        fallback={Icon}
                      />
                      <span className="min-w-0 flex-1">
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
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

// ---- Maintenance hero (technical issues, e.g. maro Web) ----
function MaintenanceHero({ tool }: { tool: ToolDef }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center"
    >
      <div className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 rounded-2xl bg-warning/10" />
        <motion.span
          className="relative text-warning"
          animate={{ rotate: [0, -18, 0, 18, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Wrench className="h-9 w-9" />
        </motion.span>
      </div>
      <h1 className="mt-6 text-[26px] font-extrabold tracking-[-0.03em] text-ink">{tool.name}</h1>
      <p className="mt-2 max-w-md text-[14.5px] text-ink-2">
        Kemi disa probleme teknike dhe po e rregullojmë defektin për një eksperiencë më të mirë.
        Faleminderit për durimin.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-[12.5px] font-semibold text-warning">
        <Wrench className="h-3.5 w-3.5" /> Në mirëmbajtje
      </span>
    </motion.div>
  );
}

// ---- Coming soon hero (Filma / Zo) ----
function ComingSoonHero({ tool }: { tool: ToolDef }) {
  const brand = getProductBrand(tool.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center"
    >
      <div className="relative h-24 w-24">
        {[0, 1, 2].map((n) => (
          <motion.span
            key={n}
            className="absolute inset-0 rounded-full border "
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: n * 0.5, ease: "easeOut" }}
          />
        ))}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand text-brand-fg" style={brand ? { backgroundColor: brand.color, color: "var(--maro-color-text-on-accent)" } : undefined}>
            <ToolIcon toolId={tool.id} fallback={tool.icon} className="h-7 w-7" />
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
