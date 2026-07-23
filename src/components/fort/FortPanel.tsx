"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertTriangle } from "lucide-react";
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

// Collapsible section wrapper.
function FortSection({
  section,
  defaultOpen,
  children,
}: {
  section: FortSectionSchema;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="block text-[13.5px] font-bold text-ink">{section.label}</span>
          {section.description && (
            <span className="block text-[12px] text-ink-3">{section.description}</span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-4 border-t border-line px-4 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: FortFieldSchema;
  value: FortValue | undefined;
  onChange: (v: FortValue) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        {field.label}
        {field.required && <span className="text-c-red">*</span>}
      </label>
      {field.description && <p className="mb-2 text-[12px] text-ink-3">{field.description}</p>}
      <FortField field={field} value={value} onChange={onChange} />
    </div>
  );
}

// The full maroFort expert panel: schema-driven, collapsible sections,
// conditional fields, conflict warnings and a brief-strength meter.
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

  return (
    <div className="space-y-2.5">
      {schema.sections.map((section, i) => {
        // Hide sections whose visibility conditions don't match.
        if (!matchesConditions(section.visibleWhen, values)) return null;
        const visibleFields = section.fields.filter((f) =>
          matchesConditions(f.visibleWhen, values)
        );
        if (visibleFields.length === 0) return null;
        return (
          <FortSection key={section.id} section={section} defaultOpen={i === 0}>
            {visibleFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                value={values[field.id] ?? field.default}
                onChange={(v) => onChange(field.id, v)}
              />
            ))}
          </FortSection>
        );
      })}

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-c-red/40 bg-c-red/5 px-4 py-3">
          {warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2 text-[12.5px] text-ink-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-c-red" />
              {w}
            </p>
          ))}
        </div>
      )}

      {resolved.briefScore && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <BriefStrength score={score} suggestion={suggestion} />
        </div>
      )}
    </div>
  );
}
