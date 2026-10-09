"use client";
import { MAX_COMPOSER_ATTACHMENTS } from "@/lib/config/attachments";

import * as React from "react";
import { readLogoDraft, saveLogoDraft } from "@/lib/marologo/draft";
import { LogoContentContext } from "./LogoContent";
import { validateLogoContent, logoInitialState, logoContentAnswerErrors, type LogoContent } from "@/lib/marologo/content";
import { useRouter } from "next/navigation";
import { Eraser, Sparkles } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { LOCAL_WORKSPACE_SCOPE } from "@/lib/storage/local";
import { useV1ImageModels } from "@/lib/hooks/useV1ImageModels";
import { generateImages, ImageGenerationError, InsufficientCreditsError } from "@/lib/services/imageService";
import { buildGenerationRequest } from "@/lib/marologo/generation";
import { V1_IMAGE_ERRORS } from "@/lib/services/imageErrors";
import { INITIAL_APP_STATE, DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { PRESENTATION_LABELS } from "@/lib/marologo/constants";
import { validateStep } from "@/lib/marologo/validation";
import type { MaroLogoAppState, MaroLogoWizardState, PresentationMode, UploadedReference, WizardPhase, WizardStep } from "@/lib/marologo/types";
import { useToast } from "@/components/ui/Toast";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { Modal } from "@/components/ui/Modal";
import { uid } from "@/lib/utils/format";
import { projectAssetErrorMessage, uploadImageReferenceDataUrl } from "@/lib/services/projectAssetService";
import type { ImageCreation } from "@/lib/types";
import { PROMPT_ATTACH_KEY, type PromptAttach } from "@/lib/prompts/types";
import type { LogoPresetConfig } from "@/lib/presets/model";
import { MaroLogoIntro } from "./MaroLogoIntro";
import { MaroLogoGenerating } from "./MaroLogoGenerating";
import { MaroLogoResult } from "./MaroLogoResult";
import { StepBrand } from "./steps/StepBrand";
import { StepDirection } from "./steps/StepDirection";
import { StepPresentation } from "./steps/StepPresentation";

type Action =
  | { type: "RESTORE"; state: MaroLogoAppState }
  | { type: "SET_PHASE"; phase: WizardPhase }
  | { type: "SET_HIGHEST"; step: WizardStep }
  | { type: "PATCH_BRAND"; patch: Partial<MaroLogoWizardState["brand"]> }
  | { type: "PATCH_DIRECTION"; patch: Partial<MaroLogoWizardState["direction"]> }
  | { type: "PATCH_LOGO"; patch: Partial<MaroLogoWizardState["logo"]> }
  | { type: "PATCH_LOOK"; patch: Partial<MaroLogoWizardState["look"]> }
  | { type: "PATCH_PRESENTATION"; mode: PresentationMode }
  | { type: "SET_REFERENCES"; references: UploadedReference[] }
  | { type: "APPLY_PRESET"; config: LogoPresetConfig }
  | { type: "CONTENT_DEFAULTS"; wizard: MaroLogoWizardState }
  | { type: "RESET" };

function reducer(state: MaroLogoAppState, action: Action): MaroLogoAppState {
  switch (action.type) {
    case "RESTORE": return action.state;
    case "SET_PHASE": return { ...state, phase: action.phase };
    case "SET_HIGHEST": return { ...state, highestStepReached: Math.max(state.highestStepReached, action.step) as WizardStep };
    case "PATCH_BRAND": return { ...state, wizard: { ...state.wizard, brand: { ...state.wizard.brand, ...action.patch } } };
    case "PATCH_DIRECTION": return { ...state, wizard: { ...state.wizard, direction: { ...state.wizard.direction, ...action.patch } } };
    case "PATCH_LOGO": return { ...state, wizard: { ...state.wizard, logo: { ...state.wizard.logo, ...action.patch } } };
    case "PATCH_LOOK": return { ...state, wizard: { ...state.wizard, look: { ...state.wizard.look, ...action.patch } } };
    case "PATCH_PRESENTATION": return { ...state, wizard: { ...state.wizard, presentation: { mode: action.mode } } };
    case "SET_REFERENCES": return { ...state, references: action.references };
    case "APPLY_PRESET": {
      const config = action.config;
      return {
        ...state,
        phase: 1,
        wizard: {
          ...state.wizard,
          direction: { traits: config.traits ?? state.wizard.direction.traits },
          logo: {
            ...state.wizard.logo,
            type: config.logoType ?? state.wizard.logo.type,
            conceptIntent: config.conceptIntent ?? state.wizard.logo.conceptIntent,
            symbolMeaning: config.creativeDirection ?? state.wizard.logo.symbolMeaning,
          },
          look: { ...state.wizard.look, visualStyle: config.visualStyle ?? state.wizard.look.visualStyle },
          presentation: { mode: config.presentationMode ?? state.wizard.presentation.mode },
        },
      };
    }
    case "CONTENT_DEFAULTS": return { ...state, wizard: action.wizard };
    case "RESET": return { ...INITIAL_APP_STATE, wizard: structuredClone(DEFAULT_WIZARD_STATE) };
    default: return state;
  }
}

const IMG_ERRORS: Record<string, string> = {
  ...V1_IMAGE_ERRORS,
  "no-key": "Gjenerimi nuk është i disponueshëm.",
  "ai-failed": "Gjenerimi dështoi. Provo përsëri.",
  empty: "Modeli nuk ktheu imazh.",
  reference_not_uploaded: "Referenca nuk u ngarkua. Hiqe dhe provo përsëri.",
  file_too_large: "Imazhi është tepër i madh. Përdor PNG, JPG ose WebP deri në 25 MB.",
};

export function MaroLogoWizard() {
  const router = useRouter();
  const [content, setContent] = React.useState<LogoContent | null>(null);
  const [contentError, setContentError] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/image/logo-content", { cache: "no-store", signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error("unavailable");
      const config = validateLogoContent((await r.json()).content);
      setContent(config);
    }).catch(() => { if (!controller.signal.aborted) setContentError(true); });
    return () => controller.abort();
  }, []);
  const [state, dispatch] = React.useReducer(reducer, INITIAL_APP_STATE);
  const pageRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    page.scrollTo({ top: 0, behavior: "instant" });
    page.scrollIntoView({ block: "start", behavior: "instant" });
  }, [state.phase, content]);
  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const [resultCreation, setResultCreation] = React.useState<ImageCreation | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [presetAttach, setPresetAttach] = React.useState<PromptAttach | null>(null);
  const generatingRef = React.useRef(false);
  const pendingGenerateRef = React.useRef(false);

  const { ready, user, credits, spendCredits, addCreation, activeWorkspaceScope } = useMaro();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id ?? activeWorkspaceScope ?? LOCAL_WORKSPACE_SCOPE;
  const { toast } = useToast();
  const model = useV1ImageModels("logo").find((entry) => entry.key === "flare" && entry.enabled);
  const cost = model?.customerCredits ?? 0;
  const userId = user?.id;
  const activeWorkspaceId = activeWorkspace?.id;
  const draftKey = `${userId ?? "guest"}:${workspaceId}`;
  const [loadedDraftKey, setLoadedDraftKey] = React.useState<string | null>(null);
  const restoredPreset = React.useRef(false);
  const previousDraftKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!content || !ready || (userId && !activeWorkspaceId)) return;
    let active = true;
    const guestKey = previousDraftKey.current?.startsWith("guest:") && userId ? previousDraftKey.current : null;
    void readLogoDraft(draftKey).then(async (saved) => {
      const draft = saved ?? (guestKey ? await readLogoDraft(guestKey) : null);
      if (!active) return;
      if (draft?.state?.wizard?.brand && draft.state.wizard.look && draft.state.wizard.logo) {
        dispatch({ type: "RESTORE", state: { ...draft.state, phase: draft.state.phase === "generating" ? 3 : draft.state.phase } });
        setPresetAttach(draft.preset);
      } else {
        dispatch({ type: "RESET" });
        dispatch({ type: "CONTENT_DEFAULTS", wizard: logoInitialState(content) });
        setPresetAttach(null);
      }
      if (guestKey && draft) { void saveLogoDraft(draftKey, draft); void saveLogoDraft(guestKey, null); }
      previousDraftKey.current = draftKey;
      restoredPreset.current = false;
      setLoadedDraftKey(draftKey);
    });
    return () => { active = false; };
  }, [content, ready, draftKey, userId, activeWorkspaceId]);
  React.useEffect(() => {
    if (loadedDraftKey !== draftKey || isGenerating || state.phase === "generating" || state.phase === "result") return;
    void saveLogoDraft(draftKey, { state, preset: presetAttach });
  }, [loadedDraftKey, draftKey, state, presetAttach, isGenerating]);
  React.useEffect(() => {
    if (!content || loadedDraftKey !== draftKey || restoredPreset.current) return;
    restoredPreset.current = true;
    try {
      const raw = sessionStorage.getItem(PROMPT_ATTACH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PromptAttach;
      sessionStorage.removeItem(PROMPT_ATTACH_KEY);
      if (parsed?.tool !== "logo" || parsed.targetTool !== "logo") return;
      setPresetAttach(parsed);
      const config = parsed.config as LogoPresetConfig;
      dispatch({ type: "APPLY_PRESET", config: { ...config, creativeDirection: content["logo.symbolMeaning"].enabled ? config.creativeDirection : undefined } });
    } catch {
      sessionStorage.removeItem(PROMPT_ATTACH_KEY);
    }
  }, [content, loadedDraftKey, draftKey]);

  const goToStep = (step: WizardStep) => {
    if (step > state.highestStepReached) return;
    dispatch({ type: "SET_PHASE", phase: step });
    setStepErrors({});
  };

  const advanceFromStep = (step: 1 | 2) => {
    const result = validateStep(step, state.wizard);
    if (content) Object.assign(result.errors, Object.fromEntries(Object.entries(logoContentAnswerErrors(state.wizard, content)).filter(([key]) => step === 1 ? ["audience", "slogan"].includes(key) : !["audience", "slogan"].includes(key))));
    result.valid = !Object.keys(result.errors).length;
    setStepErrors(result.errors);
    if (!result.valid) return;
    const next = (step + 1) as WizardStep;
    dispatch({ type: "SET_HIGHEST", step: next });
    dispatch({ type: "SET_PHASE", phase: next });
    setStepErrors({});
  };

  const runGenerate = React.useCallback(async () => {
    if (generatingRef.current) return;
    const validation = validateStep(3, state.wizard);
    if (!content) return;
    Object.assign(validation.errors, logoContentAnswerErrors(state.wizard, content));
    validation.valid = !Object.keys(validation.errors).length;
    setStepErrors(validation.errors);
    if (!validation.valid) { dispatch({ type: "SET_PHASE", phase: validation.errors.audience || validation.errors.slogan ? 1 : 2 }); return; }
    if (!user) { pendingGenerateRef.current = true; setShowAuth(true); return; }
    if (!model) { toast("Konfigurimi i gjenerimit nuk është i disponueshëm.", "error"); return; }
    if (credits < cost) { setShowBuy(true); return; }

    generatingRef.current = true;
    setIsGenerating(true);
    dispatch({ type: "SET_PHASE", phase: "generating" });
    const now = new Date().toISOString();
    const conversationId = crypto.randomUUID();
    const fort = undefined;

    try {
      const canonicalReferences = await Promise.all(
        state.references.slice(0, MAX_COMPOSER_ATTACHMENTS).map(async (reference, index) =>
          reference.storageRef ?? (await uploadImageReferenceDataUrl(reference.dataUrl, `maro-logo-reference-${index + 1}`)).storageRef
        )
      );
      const res = await generateImages({
        ...buildGenerationRequest(state.wizard, state.references, fort, canonicalReferences, presetAttach?.id),
        workspaceId: workspaceId === LOCAL_WORKSPACE_SCOPE ? undefined : workspaceId,
        conversationId,
      });
      spendCredits(res.creditsSpent || cost);
      const creation: ImageCreation = {
        id: res.generationId ?? uid("img"), serverId: res.generationId, storageRefs: res.storageRefs, workspaceId,
        conversationId, logoWizard: structuredClone(state.wizard),
        toolId: "logo", prompt: state.wizard.brand.name.trim() || "Logo", urls: res.images,
        formatLabel: PRESENTATION_LABELS[state.wizard.presentation.mode], modelLabel: model.label, speedLabel: "Normal",
        fort: Boolean(fort), createdAt: now,
      };
      addCreation(creation);
      setResultCreation(creation);
      await saveLogoDraft(draftKey, null);
      dispatch({ type: "RESET" });
      dispatch({ type: "CONTENT_DEFAULTS", wizard: logoInitialState(content) });
      setPresetAttach(null);
      dispatch({ type: "SET_PHASE", phase: "result" });
    } catch (err) {
      dispatch({ type: "SET_PHASE", phase: 3 });
      if (err instanceof InsufficientCreditsError) { setShowBuy(true); toast("Nuk ke kredite të mjaftueshme.", "error"); }
      else if (err instanceof ImageGenerationError) toast(IMG_ERRORS[err.code] || `Gabim gjenerimi (${err.code}).`, "error");
      else toast(projectAssetErrorMessage(err), "error");
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, [draftKey, content, state.wizard, state.references, user, credits, cost, model, presetAttach, spendCredits, addCreation, workspaceId, toast]);

  React.useEffect(() => {
    if (user && loadedDraftKey === draftKey && pendingGenerateRef.current) {
      pendingGenerateRef.current = false;
      void runGenerate();
    }
  }, [user, loadedDraftKey, draftKey, runGenerate]);
  const onAuthDone = () => setShowAuth(false);
  const restart = () => { setResultCreation(null); dispatch({ type: "RESET" }); if (content) dispatch({ type: "CONTENT_DEFAULTS", wizard: logoInitialState(content) }); };

  if (!content || loadedDraftKey !== draftKey) return <p className="p-8 text-ink-3">{contentError ? "Konfigurimi nuk është në dispozicion. Rifresko faqen." : "Duke ngarkuar…"}</p>;
  return (
    <LogoContentContext.Provider value={content}><div ref={pageRef} className="marologo-page flex-1 overflow-y-auto">
      {presetAttach && state.phase !== "generating" && state.phase !== "result" && (
        <div className="mx-auto mt-4 flex w-[min(1040px,calc(100%-32px))] items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-2">
          <span><strong className="text-ink">{presetAttach.title ?? presetAttach.code}</strong> po përdoret si drejtim fillestar. Çdo zgjedhje që ndryshon ti ka përparësi.</span>
          <button type="button" onClick={() => setPresetAttach(null)} className="shrink-0 font-bold text-ink-3 hover:text-ink">Hiqe</button>
        </div>
      )}
      {state.phase === "intro" && <MaroLogoIntro onStart={() => dispatch({ type: "SET_PHASE", phase: 1 })} />}
      {state.phase === 1 && <StepBrand step={1} highestStepReached={state.highestStepReached} wizard={state.wizard} errors={stepErrors} onChange={(patch) => dispatch({ type: "PATCH_BRAND", patch })} onNext={() => advanceFromStep(1)} onStepClick={goToStep} />}
      {state.phase === 2 && <StepDirection step={2} highestStepReached={state.highestStepReached} wizard={state.wizard} references={state.references} errors={stepErrors} onChangeTraits={(traits) => dispatch({ type: "PATCH_DIRECTION", patch: { traits } })} onChangeLogo={(patch) => dispatch({ type: "PATCH_LOGO", patch })} onChangeLook={(patch) => dispatch({ type: "PATCH_LOOK", patch })} onChangeReferences={(references) => dispatch({ type: "SET_REFERENCES", references })} onMaxTraits={() => toast("Zgjedh maksimum 3 tipare.", "info")} onToast={(message) => toast(message, "error")} onNext={() => advanceFromStep(2)} onStepClick={goToStep} />}
      {state.phase === 3 && <StepPresentation step={3} highestStepReached={state.highestStepReached} wizard={state.wizard} cost={model ? cost : null} generating={isGenerating} onChangePresentation={(mode) => dispatch({ type: "PATCH_PRESENTATION", mode })} onGenerate={() => void runGenerate()} onStepClick={goToStep} />}
      {state.phase === "generating" && <MaroLogoGenerating />}
      {state.phase === "result" && resultCreation && <MaroLogoResult creation={resultCreation} onRestart={restart} />}

      <Modal open={showAuth} onClose={() => setShowAuth(false)} size="sm"><AuthPanel onDone={onAuthDone} /></Modal>
      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />


    </div></LogoContentContext.Provider>
  );
}
