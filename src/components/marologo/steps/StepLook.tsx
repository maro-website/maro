"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { TypographyGrid } from "../ui/TypographyGrid";
import { DiscreteSlider } from "../ui/DiscreteSlider";
import { ColorEditor } from "../ui/ColorEditor";
import { ReferenceUpload } from "../ui/ReferenceUpload";
import { TYPOGRAPHY_SLIDER_LABELS, ADVANCED_SLIDER_LABELS } from "@/lib/marologo/constants";
import type {
  LookAdvanced,
  MaroLogoWizardState,
  TypographyControls,
  UploadedReference,
  WizardStep,
} from "@/lib/marologo/types";

export function StepLook({
  step,
  highestStepReached,
  wizard,
  references,
  errors,
  onChangeLook,
  onChangeReferences,
  onToast,
  onNext,
  onStepClick,
}: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  references: UploadedReference[];
  errors: Record<string, string>;
  onChangeLook: (patch: Partial<MaroLogoWizardState["look"]>) => void;
  onChangeReferences: (refs: UploadedReference[]) => void;
  onToast: (msg: string) => void;
  onNext: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const typoDisabled = wizard.look.typography === "maro_decides";

  const patchTypographyControls = (patch: Partial<TypographyControls>) => {
    onChangeLook({
      typographyControls: { ...wizard.look.typographyControls, ...patch },
    });
  };

  const patchAdvanced = (patch: Partial<LookAdvanced>) => {
    onChangeLook({ advanced: { ...wizard.look.advanced, ...patch } });
  };

  return (
    <WizardStepLayout
      step={step}
      highestStepReached={highestStepReached}
      title="04 - Look"
      nextLabel="Vazhdo te hapi fundit para gjenerimit"
      nextDisabled={Object.keys(errors).length > 0}
      onNext={onNext}
      onStepClick={onStepClick}
    >
      <div>
        <h3 className="mb-[10px] text-[15px] font-semibold text-ink">Typography</h3>
        <TypographyGrid
          value={wizard.look.typography}
          onChange={(typography) => onChangeLook({ typography })}
        />
      </div>

      <div className={cn(typoDisabled && "pointer-events-none opacity-50")}>
        <h3 className="mb-[10px] text-[15px] font-semibold text-ink">Advanced</h3>
        <div className="space-y-[20px]">
          {TYPOGRAPHY_SLIDER_LABELS.map((s) => (
            <DiscreteSlider
              key={s.key}
              left={s.left}
              right={s.right}
              value={wizard.look.typographyControls[s.key]}
              onChange={(v) => patchTypographyControls({ [s.key]: v })}
            />
          ))}
        </div>
      </div>

      <ColorEditor
        mode={wizard.look.colors.mode}
        values={wizard.look.colors.values}
        onModeChange={(mode) => onChangeLook({ colors: { ...wizard.look.colors, mode } })}
        onValuesChange={(values) =>
          onChangeLook({ colors: { mode: "custom", values } })
        }
        error={errors.colors}
      />

      <ReferenceUpload references={references} onChange={onChangeReferences} onError={onToast} />

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between py-2 text-[15px] font-semibold text-ink"
          aria-expanded={advancedOpen}
        >
          Advanced Controls
          <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
        </button>
        {advancedOpen && (
          <div className="mt-[10px] space-y-[20px]">
            {ADVANCED_SLIDER_LABELS.map((s) => (
              <div key={s.key}>
                <span className="marologo-field-label mb-[10px] block">{s.label}</span>
                <DiscreteSlider
                  left={s.left}
                  right={s.right}
                  value={wizard.look.advanced[s.key]}
                  onChange={(v) => patchAdvanced({ [s.key]: v })}
                />
              </div>
            ))}
            <div>
              <span className="marologo-field-label mb-[10px] block">Negative Space:</span>
              <DiscreteSlider
                left="Normal"
                right="Explore"
                steps={2}
                value={wizard.look.advanced.negativeSpace === "explore" ? 5 : 1}
                onChange={(v) => patchAdvanced({ negativeSpace: v >= 3 ? "explore" : "normal" })}
              />
            </div>
            <div>
              <span className="marologo-field-label mb-[10px] block">Construction</span>
              <DiscreteSlider
                left="Freeform"
                right="Grid-based"
                steps={2}
                value={wizard.look.advanced.construction === "grid_based" ? 5 : 1}
                onChange={(v) => patchAdvanced({ construction: v >= 3 ? "grid_based" : "freeform" })}
              />
            </div>
          </div>
        )}
      </div>
    </WizardStepLayout>
  );
}
