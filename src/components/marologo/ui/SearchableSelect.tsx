"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Check, ChevronDown } from "lucide-react";

export function SearchableSelect({
  label,
  options,
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

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const display = value || placeholder;

  return (
    <div ref={rootRef} className="relative">
      <span className="marologo-field-label mb-[10px] block">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "marologo-card flex h-[52px] w-full items-center justify-between px-[20px] text-left text-[15px]",
          value ? "text-ink" : "text-ink-3"
        )}
      >
        <span className="truncate">{display}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
      </button>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}

      {value === otherTrigger && onOtherChange && (
        <input
          type="text"
          value={otherValue ?? ""}
          placeholder={otherLabel}
          onChange={(e) => onOtherChange(e.target.value)}
          className="marologo-card mt-[10px] h-[52px] w-full px-[20px] text-[15px] text-ink outline-none placeholder:text-[var(--maro-gray-300)]"
        />
      )}

      {open && (
        <div className="maro-menu absolute z-50 mt-[10px] w-full overflow-hidden p-[10px]">
          <div className="mb-[10px]">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko…"
              className="h-[44px] w-full rounded-maro12 bg-surface-2 px-[20px] text-[14px] outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-56 space-y-[10px] overflow-y-auto">
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
                  {opt}
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
