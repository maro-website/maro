"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getFortModuleSchema } from "@/lib/fort/schema";
import { matchesConditions } from "@/lib/fort/conditions";
import { computeBriefStrength } from "@/lib/fort/briefScore";
import { detectConflicts } from "@/lib/fort/conflicts";
import { resolveFortConfig } from "@/lib/fort/config";
import type {
  FortConfig,
  FortFieldSchema,
  FortModuleId,
  FortSectionSchema,
  FortValue,
  FortValues,
} from "@/lib/fort/types";
import { FortField } from "./fields";
import { BriefStrength } from "./BriefStrength";

function FieldRow({
  field,
  value,
  onChange,
  otherValue,
  onOtherChange,
}: {
  field: FortFieldSchema;
  value: FortValue | undefined;
  onChange: (v: FortValue) => void;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        {field.label}
        {field.required && <span className="text-danger">*</span>}
      </label>
      {field.description && <p className="mb-2 text-[12px] text-ink-3">{field.description}</p>}
      <FortField
        field={field}
        value={value}
        onChange={onChange}
        otherValue={otherValue}
        onOtherChange={onOtherChange}
      />
    </div>
  );
}

type VisibleSection = {
  section: FortSectionSchema;
  fields: FortFieldSchema[];
};

// Schema-driven maroFort panel with horizontal section tabs.
export function FortPanel({
  module,
  config,
  values,
  onChange,
}: {
  module: FortModuleId;
  config: FortConfig;
  values: FortValues;
  onChange: (id: string, value: FortValue) => void;
}) {
  const schema = React.useMemo(() => getFortModuleSchema(module, config), [module, config]);
  const resolved = resolveFortConfig(config);
  const { score, suggestion } = React.useMemo(
    () => computeBriefStrength(module, values, config),
    [module, values, config]
  );
  const warnings = React.useMemo(() => detectConflicts(values), [values]);

  const visibleSections = React.useMemo<VisibleSection[]>(() => {
    return schema.sections
      .map((section) => {
        if (!matchesConditions(section.visibleWhen, values)) return null;
        const fields = section.fields.filter((f) => matchesConditions(f.visibleWhen, values));
        if (fields.length === 0) return null;
        return { section, fields };
      })
      .filter(Boolean) as VisibleSection[];
  }, [schema.sections, values]);

  const [activeTab, setActiveTab] = React.useState(visibleSections[0]?.section.id ?? "");

  React.useEffect(() => {
    if (!visibleSections.some((s) => s.section.id === activeTab)) {
      setActiveTab(visibleSections[0]?.section.id ?? "");
    }
  }, [visibleSections, activeTab]);

  const current =
    visibleSections.find((s) => s.section.id === activeTab) ?? visibleSections[0] ?? null;

  if (visibleSections.length === 0) return null;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Seksionet e maroFort"
        className="flex gap-1.5 overflow-x-auto scroll-thin pb-0.5"
      >
        {visibleSections.map(({ section }) => {
          const selected = activeTab === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(section.id)}
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors",
                selected ? "bg-brand text-brand-fg" : "bg-surface text-ink-2 hover:text-ink"
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      {current && (
        <div
          role="tabpanel"
          className="space-y-4 rounded-2xl bg-surface p-4"
        >
          {current.section.description && (
            <p className="text-[12px] leading-relaxed text-ink-3">{current.section.description}</p>
          )}
          {current.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              value={values[field.id] ?? field.default}
              onChange={(v) => onChange(field.id, v)}
              otherValue={values[`${field.id}__other`] as string | undefined}
              onOtherChange={(v) => onChange(`${field.id}__other`, v)}
            />
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-2xl bg-surface px-4 py-3">
          {warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2 text-[12.5px] text-ink-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              {w}
            </p>
          ))}
        </div>
      )}

      {resolved.briefScore && (
        <div className="rounded-2xl bg-surface px-4 py-3">
          <BriefStrength score={score} suggestion={suggestion} />
        </div>
      )}
    </div>
  );
}
