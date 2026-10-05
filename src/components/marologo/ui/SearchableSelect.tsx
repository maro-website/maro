"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useMenuKeyboard } from "@/components/ui/useMenuKeyboard";

export function SearchableSelect({
  label,
  options,
  optionLabels = {},
  value,
  onChange,
  placeholder = "Zgjedh…",
  otherValue,
  onOtherChange,
  otherLabel = "Shkruaj industrinë",
  otherTrigger = "Other",
  error,
}: {
  label: string;
  options: readonly string[];
  optionLabels?: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
  otherLabel?: string;
  otherTrigger?: string;
  error?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const labelId = React.useId();
  const listId = React.useId();
  const errorId = React.useId();
  useMenuKeyboard(open, panelRef, triggerRef, () => setOpen(false));

  const filtered = options.filter((o) => (optionLabels[o] ?? o).toLowerCase().includes(query.toLowerCase()));

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const display = (optionLabels[value] ?? value) || placeholder;

  return (
    <div ref={rootRef} className="relative">
      <span id={labelId} className="marologo-field-label mb-2 block">{label}</span>
      <button
        ref={triggerRef}
        aria-labelledby={labelId}
        aria-controls={listId}
        data-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "maro-input flex h-[var(--maro-control-height-lg)] w-full items-center justify-between text-left",
          value ? "text-ink" : "text-ink-3"
        )}
      >
        <span className="truncate">{display}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
      </button>
      {error && <p id={errorId} role="alert" className="mt-2 text-xs text-danger">{error}</p>}

      {value === otherTrigger && onOtherChange && (
        <Input
          aria-label={otherLabel}
          type="text"
          value={otherValue ?? ""}
          placeholder={otherLabel}
          onChange={(e) => onOtherChange(e.target.value)}
          className="mt-2"
        />
      )}

      {open && (
        <div ref={panelRef} className="maro-menu absolute z-[var(--maro-z-dropdown)] mt-2 min-w-0 w-full overflow-hidden p-4">
          <div className="mb-[10px]">
            <Input
              aria-label={`Kërko ${label.toLowerCase()}`}
              className="maro-search-input"
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko…"
            />
          </div>
          <ul id={listId} role="listbox" aria-labelledby={labelId} className="max-h-56 space-y-1 overflow-y-auto">
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex min-h-[44px] w-full items-center justify-between rounded-maro12 px-[20px] text-left text-[14px] hover:bg-surface-2",
                    value === opt && "bg-brand/10 text-brand"
                  )}
                >
                  {optionLabels[opt] ?? opt}
                  {value === opt && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-[13px] text-ink-3">Asnjë rezultat</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
