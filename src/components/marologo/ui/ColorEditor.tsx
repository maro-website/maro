"use client";

import { useLogoContent } from "../LogoContent";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MAX_COLORS } from "@/lib/marologo/constants";
import { normalizeHex } from "@/lib/marologo/validation";
import { MaroDecidesCheckbox } from "./LogoTypeCards";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ColorEditor({
  mode,
  values,
  onModeChange,
  onValuesChange,
  error,
}: {
  mode: "custom" | "maro_decides";
  values: string[];
  onModeChange: (mode: "custom" | "maro_decides") => void;
  onValuesChange: (values: string[]) => void;
  error?: string;
}) {
  const content = useLogoContent();
  const [draft, setDraft] = React.useState("#00ff72");
  const [feedback, setFeedback] = React.useState("");
  const customActive = mode === "custom";

  const addColor = () => {
    const hex = normalizeHex(draft);
    if (!hex) { setFeedback("Shkruaj një ngjyrë HEX të vlefshme, p.sh. #00FF72."); return; }
    if (values.length >= MAX_COLORS) return;
    if (values.some(value => normalizeHex(value) === hex)) { setFeedback("Kjo ngjyrë është shtuar tashmë."); return; }
    setFeedback("");
    onModeChange("custom");
    onValuesChange([...values, hex]);
  };

  const removeColor = (index: number) => {
    setFeedback("");
    onValuesChange(values.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, raw: string) => {
    const next = [...values];
    next[index] = raw;
    onValuesChange(next);
  };

  return (
    <div className="space-y-[20px]">
      <h3 className="text-xl font-semibold text-ink">{content["look.colors"].label}</h3>

      <div className={cn(!customActive && "opacity-50 pointer-events-none")}>
        <span className="marologo-field-label mb-[10px] block">Kam ngjyra:</span>
        <div className="space-y-[10px]">
          {values.map((hex, i) => (
            <div key={i} className="marologo-card flex items-center gap-3 p-3">
              <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-maro12 border border-line-strong">
                <span className="block h-full w-full" style={{ background: normalizeHex(hex) ?? "var(--maro-color-bg-surface-02)" }} />
                <input
                  aria-label={`Ngjyra ${i + 1}`}
                  disabled={!customActive}
                  type="color"
                  value={normalizeHex(hex) ?? "#00ff72"}
                  onChange={(e) => updateColor(i, e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              <Input
                aria-label={`Ngjyra ${i + 1} HEX`}
                disabled={!customActive}
                type="text"
                value={hex}
                onChange={(e) => updateColor(i, e.target.value)}
                maxLength={7}
                spellCheck={false}
                aria-invalid={!normalizeHex(hex) || undefined}
                onBlur={() => {
                  const clean = normalizeHex(hex);
                  if (clean) updateColor(i, clean);
                }}
                className="min-w-0 flex-1 font-mono uppercase"
              />
              <button
                disabled={!customActive}
                type="button"
                aria-label="Hiq ngjyrën"
                onClick={() => removeColor(i)}
                className="maro-icon-button text-ink-3 hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {values.length < MAX_COLORS && (
          <div className="mt-[10px] flex gap-[10px]">
            <label className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-maro12 border border-line-strong">
              <span className="block h-full w-full" style={{ background: normalizeHex(draft) ?? "var(--maro-color-bg-surface-02)" }} />
              <input type="color" aria-label="Zgjedh ngjyrën e re" disabled={!customActive} value={normalizeHex(draft) ?? "#00ff72"} onChange={event => setDraft(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            <Input
              aria-label="Ngjyra e re HEX"
              disabled={!customActive}
              type="text"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setFeedback(""); }}
              maxLength={7}
              placeholder={content["look.colors"].placeholder}
              className="min-w-0 flex-1"
            />
            <Button variant="secondary" disabled={!customActive}
              type="button"
              onClick={addColor}
            >
              Shto
            </Button>
          </div>
        )}
      </div>

      <MaroDecidesCheckbox
        checked={mode === "maro_decides"}
        onChange={(checked) => onModeChange(checked ? "maro_decides" : "custom")}
        label="Leja maro le t'vendos"
      />

      {(feedback || error) && <p role="alert" className="text-sm text-danger">{feedback || error}</p>}
    </div>
  );
}
