"use client";

import * as React from "react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { LOCAL_WORKSPACE_SCOPE } from "@/lib/storage/local";
import { useSettings } from "@/lib/hooks/useSettings";
import { getTool, toolSelectionCost } from "@/lib/tools/registry";
import {
  generateImages,
  ImageGenerationError,
  InsufficientCreditsError,
} from "@/lib/services/imageService";
import { buildGenerationRequest, buildGenerationSelections } from "@/lib/marologo/generation";
import { INITIAL_APP_STATE, DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { validateStep } from "@/lib/marologo/validation";
import type {
  MaroLogoAppState,
  MaroLogoWizardState,
  UploadedReference,
  WizardPhase,
  WizardStep,
} from "@/lib/marologo/types";
import { useToast } from "@/components/ui/Toast";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { Modal } from "@/components/ui/Modal";
import { uid } from "@/lib/utils/format";
import type { ImageCreation } from "@/lib/types";
import { MaroLogoIntro } from "./MaroLogoIntro";
import { MaroLogoGenerating } from "./MaroLogoGenerating";
import { MaroLogoResult } from "./MaroLogoResult";
import { StepBrand } from "./steps/StepBrand";
import { StepDirection } from "./steps/StepDirection";
import { StepLogo } from "./steps/StepLogo";
import { StepLook } from "./steps/StepLook";
import { StepFinish } from "./steps/StepFinish";

type Action =
  | { type: "SET_PHASE"; phase: WizardPhase }
  | { type: "SET_HIGHEST"; step: WizardStep }
  | { type: "PATCH_WIZARD"; patch: Partial<MaroLogoWizardState> }
  | { type: "PATCH_BRAND"; patch: Partial<MaroLogoWizardState["brand"]> }
  | { type: "PATCH_DIRECTION"; patch: Partial<MaroLogoWizardState["direction"]> }
  | { type: "PATCH_DIRECTION_SLIDERS"; patch: Partial<MaroLogoWizardState["direction"]["sliders"]> }
  | { type: "PATCH_LOGO"; patch: Partial<MaroLogoWizardState["logo"]> }
  | { type: "PATCH_LOOK"; patch: Partial<MaroLogoWizardState["look"]> }
  | { type: "PATCH_FINISH"; patch: Partial<MaroLogoWizardState["finish"]> }
  | { type: "SET_REFERENCES"; references: UploadedReference[] }
  | { type: "SET_GENERATION"; generation: MaroLogoAppState["generation"] }
  | { type: "RESET" };

function reducer(state: MaroLogoAppState, action: Action): MaroLogoAppState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "SET_HIGHEST":
      return {
        ...state,
        highestStepReached: Math.max(state.highestStepReached, action.step) as WizardStep,
      };
    case "PATCH_WIZARD":
      return { ...state, wizard: { ...state.wizard, ...action.patch } };
    case "PATCH_BRAND":
      return { ...state, wizard: { ...state.wizard, brand: { ...state.wizard.brand, ...action.patch } } };
    case "PATCH_DIRECTION":
      return {
        ...state,
        wizard: { ...state.wizard, direction: { ...state.wizard.direction, ...action.patch } },
      };
    case "PATCH_DIRECTION_SLIDERS":
      return {
        ...state,
        wizard: {
          ...state.wizard,
          direction: {
            ...state.wizard.direction,
            sliders: { ...state.wizard.direction.sliders, ...action.patch },
          },
        },
      };
    case "PATCH_LOGO":
      return { ...state, wizard: { ...state.wizard, logo: { ...state.wizard.logo, ...action.patch } } };
    case "PATCH_LOOK":
      return { ...state, wizard: { ...state.wizard, look: { ...state.wizard.look, ...action.patch } } };
    case "PATCH_FINISH":
      return { ...state, wizard: { ...state.wizard, finish: { ...state.wizard.finish, ...action.patch } } };
    case "SET_REFERENCES":
      return { ...state, references: action.references };
    case "SET_GENERATION":
      return { ...state, generation: action.generation };
    case "RESET":
      return { ...INITIAL_APP_STATE, wizard: { ...DEFAULT_WIZARD_STATE } };
    default:
      return state;
  }
}

const IMG_ERRORS: Record<string, string> = {
  "no-key": "Gjenerimi nuk është i disponueshëm.",
  "ai-failed": "Gjenerimi dështoi. Provo përsëri.",
  empty: "Modeli nuk ktheu imazh.",
};

export function MaroLogoWizard() {
  const [state, dispatch] = React.useReducer(reducer, INITIAL_APP_STATE);
  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const [resultCreation, setResultCreation] = React.useState<ImageCreation | null>(null);
  const generatingRef = React.useRef(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const pendingGenerateRef = React.useRef(false);

  const { user, credits, spendCredits, addCreation, activeWorkspaceScope } = useMaro();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id ?? activeWorkspaceScope ?? LOCAL_WORKSPACE_SCOPE;
  const { pricing } = useSettings(Boolean(user));
  const { toast } = useToast();

  const tool = getTool("logo")!;
  const selections = buildGenerationSelections(state.wizard);
  const cost = toolSelectionCost(tool, selections, pricing.options);

  const goToStep = (step: WizardStep) => {
    if (step > state.highestStepReached) return;
    dispatch({ type: "SET_PHASE", phase: step });
    setStepErrors({});
  };

  const advanceFromStep = (step: WizardStep) => {
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
    const v5 = validateStep(5, state.wizard);
    setStepErrors(v5.errors);
    if (!v5.valid) return;

    if (!user) {
      pendingGenerateRef.current = true;
      setShowAuth(true);
      return;
    }
    if (credits < cost) {
      setShowBuy(true);
      return;
    }

    generatingRef.current = true;
    setIsGenerating(true);
    dispatch({ type: "SET_PHASE", phase: "generating" });

    const now = new Date().toISOString();
    const briefPreview = state.wizard.brand.name.trim() || "Logo";

    try {
      const req = buildGenerationRequest(state.wizard, state.references);
      const res = await generateImages(req);
      spendCredits(res.creditsSpent || cost);

      const creation: ImageCreation = {
        id: res.generationId ?? uid("img"),
        serverId: res.generationId,
        storageRefs: res.storageRefs,
        workspaceId,
        toolId: "logo",
        prompt: briefPreview,
        urls: res.images,
        formatLabel: "Logo me ngjyra",
        modelLabel: "GPT Image 2",
        speedLabel: "Normal",
        createdAt: now,
      };
      addCreation(creation);
      setResultCreation(creation);
      dispatch({ type: "SET_PHASE", phase: "result" });
    } catch (err) {
      dispatch({ type: "SET_PHASE", phase: 5 });
      if (err instanceof InsufficientCreditsError) {
        setShowBuy(true);
        toast("Nuk ke kredite të mjaftueshme.", "error");
      } else if (err instanceof ImageGenerationError) {
        toast(IMG_ERRORS[err.code] || `Gabim gjenerimi (${err.code}).`, "error");
      } else {
        toast("Gabim i papritur. Provo përsëri.", "error");
      }
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, [state.wizard, state.references, user, credits, cost, spendCredits, addCreation, workspaceId, toast]);

  const onAuthDone = () => {
    setShowAuth(false);
    if (pendingGenerateRef.current) {
      pendingGenerateRef.current = false;
      setTimeout(() => void runGenerate(), 400);
    }
  };

  const restart = () => {
    setResultCreation(null);
    dispatch({ type: "RESET" });
  };

  return (
    <div className="marologo-page flex-1 overflow-y-auto">
      {state.phase === "intro" && (
        <MaroLogoIntro onStart={() => dispatch({ type: "SET_PHASE", phase: 1 })} />
      )}

      {state.phase === 1 && (
        <StepBrand
          step={1}
          highestStepReached={state.highestStepReached}
          wizard={state.wizard}
          errors={stepErrors}
          onChange={(patch) => dispatch({ type: "PATCH_BRAND", patch })}
          onNext={() => advanceFromStep(1)}
          onStepClick={goToStep}
        />
      )}

      {state.phase === 2 && (
        <StepDirection
          step={2}
          highestStepReached={state.highestStepReached}
          wizard={state.wizard}
          errors={stepErrors}
          onChangeTraits={(traits) => dispatch({ type: "PATCH_DIRECTION", patch: { traits } })}
          onChangeSliders={(patch) => dispatch({ type: "PATCH_DIRECTION_SLIDERS", patch })}
          onChangeAudience={(audience) => dispatch({ type: "PATCH_DIRECTION", patch: { audience } })}
          onMaxTraits={() => toast("Mundesh me zgjedh maksimum 5.", "info")}
          onNext={() => advanceFromStep(2)}
          onStepClick={goToStep}
        />
      )}

      {state.phase === 3 && (
        <StepLogo
          step={3}
          highestStepReached={state.highestStepReached}
          wizard={state.wizard}
          onChange={(patch) => dispatch({ type: "PATCH_LOGO", patch })}
          onNext={() => advanceFromStep(3)}
          onStepClick={goToStep}
        />
      )}

      {state.phase === 4 && (
        <StepLook
          step={4}
          highestStepReached={state.highestStepReached}
          wizard={state.wizard}
          references={state.references}
          errors={stepErrors}
          onChangeLook={(patch) => dispatch({ type: "PATCH_LOOK", patch })}
          onChangeReferences={(references) => dispatch({ type: "SET_REFERENCES", references })}
          onToast={(msg) => toast(msg, "error")}
          onNext={() => advanceFromStep(4)}
          onStepClick={goToStep}
        />
      )}

      {state.phase === 5 && (
        <StepFinish
          step={5}
          highestStepReached={state.highestStepReached}
          wizard={state.wizard}
          errors={stepErrors}
          cost={cost}
          generating={isGenerating}
          onChangeFinish={(patch) => dispatch({ type: "PATCH_FINISH", patch })}
          onGenerate={() => void runGenerate()}
          onStepClick={goToStep}
        />
      )}

      {state.phase === "generating" && <MaroLogoGenerating />}

      {state.phase === "result" && resultCreation && (
        <MaroLogoResult creation={resultCreation} onRestart={restart} />
      )}

      <Modal open={showAuth} onClose={() => setShowAuth(false)} size="sm">
        <AuthPanel onDone={onAuthDone} />
      </Modal>

      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />
    </div>
  );
}
