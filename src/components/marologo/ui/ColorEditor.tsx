"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MAX_COLORS } from "@/lib/marologo/constants";
import { normalizeHex } from "@/lib/marologo/validation";
import { MaroDecidesCheckbox } from "./LogoTypeCards";

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
  const [draft, setDraft] = React.useState("#253FDA");
  const customActive = mode === "custom";

  const addColor = () => {
    const hex = normalizeHex(draft);
    if (!hex) return;
    if (values.length >= MAX_COLORS) return;
    if (values.includes(hex)) return;
    onModeChange("custom");
    onValuesChange([...values, hex]);
  };

  const removeColor = (hex: string) => {
    onValuesChange(values.filter((v) => v !== hex));
  };

  const updateColor = (index: number, raw: string) => {
    const hex = normalizeHex(raw);
    if (!hex) {
      const next = [...values];
      next[index] = raw;
      onValuesChange(next);
      return;
    }
    const next = [...values];
    next[index] = hex;
    onValuesChange(next);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-semibold text-ink">Ngjyrat</h3>

      <div className={cn(!customActive && "opacity-50 pointer-events-none")}>
        <span className="marologo-field-label mb-2 block">Kam ngjyra:</span>
        <div className="space-y-2">
          {values.map((hex, i) => (
            <div key={`${hex}-${i}`} className="marologo-card flex items-center gap-2 px-3 py-2">
              <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg">
                <span className="block h-full w-full" style={{ background: normalizeHex(hex) ?? hex }} />
                <input
                  type="color"
                  value={normalizeHex(hex)?.slice(1) ?? "253FDA"}
                  onChange={(e) => updateColor(i, `#${e.target.value}`)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <input
                type="text"
                value={hex}
                onChange={(e) => updateColor(i, e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
              />
              <button
                type="button"
                aria-label="Hiq ngjyrën"
                onClick={() => removeColor(hex)}
                className="rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {values.length < MAX_COLORS && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="#253FDA"
              className="marologo-card h-11 min-w-0 flex-1 px-4 text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={addColor}
              className="marologo-card px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-3 hover:text-ink"
            >
              SHTO +
            </button>
          </div>
        )}
      </div>

      <MaroDecidesCheckbox
        checked={mode === "maro_decides"}
        onChange={(checked) => onModeChange(checked ? "maro_decides" : "custom")}
        label="Leja maro le t'vendos"
      />

      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
