"use client";

import { Field, Textarea } from "@/components/ui/Input";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { LogoTypeCards } from "../ui/LogoTypeCards";
import { SymbolDirectionPills } from "../ui/TypographyGrid";
import type { LogoTypeValue, MaroLogoWizardState, WizardStep } from "@/lib/marologo/types";

function showSymbolSection(type: LogoTypeValue): boolean {
  return type === "symbol" || type === "symbol_wordmark";
}

export function StepLogo({
  step,
  highestStepReached,
  wizard,
  onChange,
  onNext,
  onStepClick,
}: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  onChange: (patch: Partial<MaroLogoWizardState["logo"]>) => void;
  onNext: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  const symbolVisible = showSymbolSection(wizard.logo.type);

  return (
    <WizardStepLayout
      step={step}
      highestStepReached={highestStepReached}
      title="03 - Logo"
      nextLabel="Vazhdo - Hapi 4: Look"
      onNext={onNext}
      onStepClick={onStepClick}
    >
      <div>
        <span className="marologo-field-label mb-3 block">Logo Type</span>
        <LogoTypeCards value={wizard.logo.type} onChange={(type) => onChange({ type })} />
      </div>

      {symbolVisible && (
        <div className="space-y-4">
          <span className="block text-[15px] font-semibold text-ink">Symbol Direction</span>

          <Field label="Çka duhet me përfaqësu simboli?">
            <Textarea
              value={wizard.logo.symbolMeaning}
              onChange={(e) => onChange({ symbolMeaning: e.target.value })}
              rows={3}
              placeholder="P.sh. lidhje, shpejtësi, kreativitet."
              className="marologo-card min-h-[100px] border-0 bg-surface"
            />
          </Field>

          <div>
            <span className="marologo-field-label mb-2 block">Preferon simbolin të jetë:</span>
            <SymbolDirectionPills
              value={wizard.logo.symbolDirection}
              onChange={(v) => onChange({ symbolDirection: v })}
            />
          </div>

          <Field label="A ka diçka që duhet patjetër me u përfshi?">
            <Textarea
              value={wizard.logo.mustInclude}
              onChange={(e) => onChange({ mustInclude: e.target.value })}
              rows={2}
              placeholder="Shkronja M, një mal, një gjethe..."
              className="marologo-card border-0 bg-surface"
            />
          </Field>
        </div>
      )}

      <Field label="Çka nuk don me pa?">
        <Textarea
          value={wizard.logo.avoid}
          onChange={(e) => onChange({ avoid: e.target.value })}
          rows={2}
          placeholder="Mos përdor lightning bolts, globes ose AI sparkles."
          className="marologo-card border-0 bg-surface"
        />
      </Field>
    </WizardStepLayout>
  );
}
