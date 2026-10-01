"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eraser, Sparkles } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { LOCAL_WORKSPACE_SCOPE } from "@/lib/storage/local";
import { useSettings } from "@/lib/hooks/useSettings";
import { getTool, toolSelectionCost } from "@/lib/tools/registry";
import { generateImages, ImageGenerationError, InsufficientCreditsError } from "@/lib/services/imageService";
import { buildGenerationRequest, buildGenerationSelections } from "@/lib/marologo/generation";
import { INITIAL_APP_STATE, DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { PRESENTATION_LABELS } from "@/lib/marologo/constants";
import { validateStep } from "@/lib/marologo/validation";
import type { MaroLogoAppState, MaroLogoWizardState, PresentationMode, UploadedReference, WizardPhase, WizardStep } from "@/lib/marologo/types";
import { defaultFortValues } from "@/lib/fort/schema";
import { isFortModuleEnabled, resolveFortConfig } from "@/lib/fort/config";
import type { FortValue } from "@/lib/fort/types";
import { loadFortValues, saveFortValues } from "@/lib/tools/selections";
import { FortPanel } from "@/components/fort/FortPanel";
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
  | { type: "SET_PHASE"; phase: WizardPhase }
  | { type: "SET_HIGHEST"; step: WizardStep }
  | { type: "PATCH_BRAND"; patch: Partial<MaroLogoWizardState["brand"]> }
  | { type: "PATCH_DIRECTION"; patch: Partial<MaroLogoWizardState["direction"]> }
  | { type: "PATCH_LOGO"; patch: Partial<MaroLogoWizardState["logo"]> }
  | { type: "PATCH_LOOK"; patch: Partial<MaroLogoWizardState["look"]> }
  | { type: "PATCH_PRESENTATION"; mode: PresentationMode }
  | { type: "SET_REFERENCES"; references: UploadedReference[] }
  | { type: "APPLY_PRESET"; config: LogoPresetConfig }
  | { type: "RESET" };

function reducer(state: MaroLogoAppState, action: Action): MaroLogoAppState {
  switch (action.type) {
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
    case "RESET": return { ...INITIAL_APP_STATE, wizard: structuredClone(DEFAULT_WIZARD_STATE) };
    default: return state;
  }
}

const IMG_ERRORS: Record<string, string> = {
  "no-key": "Gjenerimi nuk është i disponueshëm.",
  "ai-failed": "Gjenerimi dështoi. Provo përsëri.",
  empty: "Modeli nuk ktheu imazh.",
  reference_not_uploaded: "Referenca nuk u ngarkua. Hiqe dhe provo përsëri.",
  file_too_large: "Imazhi është tepër i madh. Përdor PNG, JPG ose WebP deri në 25 MB.",
};

export function MaroLogoWizard() {
  const router = useRouter();
  const [state, dispatch] = React.useReducer(reducer, INITIAL_APP_STATE);
  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const [resultCreation, setResultCreation] = React.useState<ImageCreation | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [fortActive, setFortActive] = React.useState(false);
  const [fortModalOpen, setFortModalOpen] = React.useState(false);
  const [fortValues, setFortValues] = React.useState<Record<string, FortValue>>({});
  const [presetAttach, setPresetAttach] = React.useState<PromptAttach | null>(null);
  const generatingRef = React.useRef(false);
  const pendingGenerateRef = React.useRef(false);

  const { user, credits, hasFort, spendCredits, addCreation, activeWorkspaceScope } = useMaro();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id ?? activeWorkspaceScope ?? LOCAL_WORKSPACE_SCOPE;
  const { pricing, fortConfig } = useSettings(Boolean(user));
  const { toast } = useToast();
  const tool = getTool("logo")!;
  const selections = buildGenerationSelections(state.wizard);
  const cost = toolSelectionCost(tool, selections, pricing.options);
  const fortAvailable = isFortModuleEnabled(fortConfig, "logo");
  const fortResolved = resolveFortConfig(fortConfig);

  React.useEffect(() => {
    const defaults = defaultFortValues("logo", fortConfig) as Record<string, FortValue>;
    const saved = loadFortValues("logo") as Record<string, FortValue>;
    setFortValues({ ...defaults, ...saved });
  }, [fortConfig]);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PROMPT_ATTACH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PromptAttach;
      sessionStorage.removeItem(PROMPT_ATTACH_KEY);
      if (parsed?.tool !== "logo" || parsed.targetTool !== "logo") return;
      setPresetAttach(parsed);
      dispatch({ type: "APPLY_PRESET", config: parsed.config as LogoPresetConfig });
    } catch {
      sessionStorage.removeItem(PROMPT_ATTACH_KEY);
    }
  }, []);

  const goToStep = (step: WizardStep) => {
    if (step > state.highestStepReached) return;
    dispatch({ type: "SET_PHASE", phase: step });
    setStepErrors({});
  };

  const advanceFromStep = (step: 1 | 2) => {
    const result = validateStep(step, state.wizard);
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
    setStepErrors(validation.errors);
    if (!validation.valid) return;
    if (!user) { pendingGenerateRef.current = true; setShowAuth(true); return; }
    if (credits < cost) { setShowBuy(true); return; }

    generatingRef.current = true;
    setIsGenerating(true);
    dispatch({ type: "SET_PHASE", phase: "generating" });
    const now = new Date().toISOString();
    const fort = fortAvailable && fortActive && hasFort ? { enabled: true, values: fortValues } : undefined;

    try {
      const canonicalReferences = await Promise.all(
        state.references.slice(0, 3).map(async (reference, index) =>
          (await uploadImageReferenceDataUrl(reference.dataUrl, `maro-logo-reference-${index + 1}`)).storageRef
        )
      );
      const res = await generateImages(buildGenerationRequest(state.wizard, state.references, fort, canonicalReferences, presetAttach?.id));
      spendCredits(res.creditsSpent || cost);
      const creation: ImageCreation = {
        id: res.generationId ?? uid("img"), serverId: res.generationId, storageRefs: res.storageRefs, workspaceId,
        toolId: "logo", prompt: state.wizard.brand.name.trim() || "Logo", urls: res.images,
        formatLabel: PRESENTATION_LABELS[state.wizard.presentation.mode], modelLabel: "GPT Image 2", speedLabel: "Normal",
        fort: Boolean(fort), createdAt: now,
      };
      addCreation(creation);
      setResultCreation(creation);
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
  }, [state.wizard, state.references, user, credits, cost, fortAvailable, fortActive, hasFort, fortValues, presetAttach, spendCredits, addCreation, workspaceId, toast]);

  const onAuthDone = () => { setShowAuth(false); if (pendingGenerateRef.current) { pendingGenerateRef.current = false; setTimeout(() => void runGenerate(), 400); } };
  const openFort = () => { if (!hasFort) { router.push("/pricing"); return; } setFortModalOpen(true); };
  const saveFort = () => { saveFortValues("logo", fortValues); setFortActive(true); setFortModalOpen(false); };
  const clearFort = () => { const defaults = defaultFortValues("logo", fortConfig) as Record<string, FortValue>; setFortValues(defaults); saveFortValues("logo", defaults); setFortActive(false); setFortModalOpen(false); };
  const restart = () => { setResultCreation(null); dispatch({ type: "RESET" }); };

  return (
    <div className="marologo-page flex-1 overflow-y-auto">
      {presetAttach && state.phase !== "generating" && state.phase !== "result" && (
        <div className="mx-auto mt-4 flex w-[min(1040px,calc(100%-32px))] items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-2">
          <span><strong className="text-ink">{presetAttach.title ?? presetAttach.code}</strong> po përdoret si drejtim fillestar. Çdo zgjedhje që ndryshon ti ka përparësi.</span>
          <button type="button" onClick={() => setPresetAttach(null)} className="shrink-0 font-bold text-ink-3 hover:text-ink">Hiqe</button>
        </div>
      )}
      {state.phase === "intro" && <MaroLogoIntro onStart={() => dispatch({ type: "SET_PHASE", phase: 1 })} />}
      {state.phase === 1 && <StepBrand step={1} highestStepReached={state.highestStepReached} wizard={state.wizard} errors={stepErrors} onChange={(patch) => dispatch({ type: "PATCH_BRAND", patch })} onNext={() => advanceFromStep(1)} onStepClick={goToStep} />}
      {state.phase === 2 && <StepDirection step={2} highestStepReached={state.highestStepReached} wizard={state.wizard} references={state.references} errors={stepErrors} onChangeTraits={(traits) => dispatch({ type: "PATCH_DIRECTION", patch: { traits } })} onChangeLogo={(patch) => dispatch({ type: "PATCH_LOGO", patch })} onChangeLook={(patch) => dispatch({ type: "PATCH_LOOK", patch })} onChangeReferences={(references) => dispatch({ type: "SET_REFERENCES", references })} onMaxTraits={() => toast("Zgjedh maksimum 3 tipare.", "info")} onToast={(message) => toast(message, "error")} onNext={() => advanceFromStep(2)} onStepClick={goToStep} />}
      {state.phase === 3 && <StepPresentation step={3} highestStepReached={state.highestStepReached} wizard={state.wizard} cost={cost} generating={isGenerating} fortAvailable={fortAvailable} fortActive={fortActive} hasFort={hasFort} onChangePresentation={(mode) => dispatch({ type: "PATCH_PRESENTATION", mode })} onOpenFort={openFort} onGenerate={() => void runGenerate()} onStepClick={goToStep} />}
      {state.phase === "generating" && <MaroLogoGenerating />}
      {state.phase === "result" && resultCreation && <MaroLogoResult creation={resultCreation} onRestart={restart} />}

      <Modal open={showAuth} onClose={() => setShowAuth(false)} size="sm"><AuthPanel onDone={onAuthDone} /></Modal>
      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />

      <Modal open={fortModalOpen} onClose={() => setFortModalOpen(false)} size="lg" className="max-w-2xl overflow-hidden bg-canvas" hideClose>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-surface"><Sparkles className="h-5 w-5" /></span><div><div className="text-[16px] font-extrabold text-ink">{fortResolved.label}</div><div className="text-[12.5px] text-ink-3">Kontrolle eksperte për këtë identitet</div></div></div>
          <button type="button" onClick={clearFort} className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2"><Eraser className="h-3.5 w-3.5" />Pastroje</button>
        </div>
        <div className="scroll-thin max-h-[60vh] overflow-y-auto px-5 pb-4"><FortPanel module="logo" config={fortConfig} values={fortValues} onChange={(id, value) => setFortValues((current) => ({ ...current, [id]: value }))} /></div>
        <div className="flex gap-2 px-5 py-4"><button type="button" onClick={() => setFortModalOpen(false)} className="flex-1 rounded-xl bg-surface px-4 py-3 text-[14px] font-semibold text-ink">Anulo</button><button type="button" onClick={saveFort} className="flex-1 rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-brand-fg">Apliko maroFort</button></div>
      </Modal>
    </div>
  );
}
