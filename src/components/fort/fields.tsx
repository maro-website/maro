"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FortFieldSchema, FortValue } from "@/lib/fort/types";

// ---------------------------------------------------------------------------
// Pill (single) select
// ---------------------------------------------------------------------------
export function FortSelect({
  field,
  value,
  onChange,
}: {
  field: FortFieldSchema;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(field.options ?? []).map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(active ? "" : o.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "border-brand bg-brand-soft text-brand"
                : "border-line-strong bg-surface text-ink-2 hover:text-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pill multi-select (respects maxSelect)
// ---------------------------------------------------------------------------
export function FortMultiSelect({
  field,
  value,
  onChange,
}: {
  field: FortFieldSchema;
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const selected = value ?? [];
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      if (field.maxSelect && selected.length >= field.maxSelect) return;
      onChange([...selected, id]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {(field.options ?? []).map((o) => {
        const active = selected.includes(o.id);
        const full = Boolean(field.maxSelect && selected.length >= field.maxSelect && !active);
        return (
          <button
            key={o.id}
            type="button"
            disabled={full}
            onClick={() => toggle(o.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "border-brand bg-brand-soft text-brand"
                : full
                ? "cursor-not-allowed border-line bg-surface text-ink-3 opacity-60"
                : "border-line-strong bg-surface text-ink-2 hover:text-ink"
            )}
          >
            {active && <Check className="h-3 w-3" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text / textarea
// ---------------------------------------------------------------------------
export function FortTextInput({
  field,
  value,
  onChange,
}: {
  field: FortFieldSchema;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value ?? ""}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
    />
  );
}

export function FortTextarea({
  field,
  value,
  onChange,
}: {
  field: FortFieldSchema;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value ?? ""}
      placeholder={field.placeholder}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
    />
  );
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------
export function FortSlider({
  field,
  value,
  onChange,
}: {
  field: FortFieldSchema;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const n = Number(value ?? field.default ?? 50);
  return (
    <div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Number.isFinite(n) ? n : 50}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-brand"
      />
      <div className="mt-1 flex justify-between text-[11.5px] text-ink-3">
        <span>{field.sliderMin ?? "0"}</span>
        <span className="font-semibold text-ink-2">{Number.isFinite(n) ? n : 50}%</span>
        <span>{field.sliderMax ?? "100"}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
export function FortColorPicker({
  value,
  onChange,
  fallback = "#3b17ff",
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  fallback?: string;
}) {
  const v = value || fallback;
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border border-line-strong">
        <span className="block h-full w-full" style={{ background: v }} />
        <input
          type="color"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3x3 position grid
// ---------------------------------------------------------------------------
const GRID_CELLS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export function FortPositionGrid({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-grid grid-cols-3 gap-1 rounded-xl border border-line-strong bg-surface p-1">
      {GRID_CELLS.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(active ? "" : c)}
            aria-label={c}
            className={cn(
              "h-7 w-7 rounded-md transition-colors",
              active ? "bg-brand" : "bg-surface-2 hover:bg-line"
            )}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset control — reference type + preservation strength (value is an object)
// ---------------------------------------------------------------------------
const ASSET_TYPES = [
  { id: "product", label: "Produkt" },
  { id: "logo", label: "Logo" },
  { id: "style", label: "Stil" },
  { id: "background", label: "Sfond" },
];

export function FortAssetControl({
  value,
  onChange,
}: {
  value: Record<string, unknown> | undefined;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const v = value ?? {};
  const type = (v.type as string) ?? "product";
  const strength = Number(v.strength ?? 60);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {ASSET_TYPES.map((t) => {
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ ...v, type: t.id })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line-strong bg-surface text-ink-2 hover:text-ink"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={strength}
          onChange={(e) => onChange({ ...v, strength: Number(e.target.value) })}
          className="w-full accent-brand"
        />
        <div className="mt-1 flex justify-between text-[11.5px] text-ink-3">
          <span>E lirshme</span>
          <span className="font-semibold text-ink-2">{strength}%</span>
          <span>Besnike</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic field dispatcher
// ---------------------------------------------------------------------------
export function FortField({
  field,
  value,
  onChange,
}: {
  field: FortFieldSchema;
  value: FortValue | undefined;
  onChange: (v: FortValue) => void;
}) {
  switch (field.type) {
    case "select":
      return <FortSelect field={field} value={value as string} onChange={onChange} />;
    case "multiselect":
      return <FortMultiSelect field={field} value={value as string[]} onChange={onChange} />;
    case "text":
      return <FortTextInput field={field} value={value as string} onChange={onChange} />;
    case "textarea":
      return <FortTextarea field={field} value={value as string} onChange={onChange} />;
    case "slider":
      return <FortSlider field={field} value={value as string} onChange={onChange} />;
    case "color":
      return (
        <FortColorPicker
          value={value as string}
          fallback={(field.default as string) || "#3b17ff"}
          onChange={onChange}
        />
      );
    case "positionGrid":
      return <FortPositionGrid value={value as string} onChange={onChange} />;
    case "assetControl":
      return (
        <FortAssetControl value={value as Record<string, unknown>} onChange={onChange} />
      );
    default:
      return null;
  }
}
