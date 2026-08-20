"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Check, ChevronDown, X } from "lucide-react";
import { LOGO_USAGE, LOGO_USAGE_EVERYTHING } from "@/lib/marologo/constants";

export function UsageMultiSelect({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const filtered = LOGO_USAGE.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (opt: string) => {
    if (opt === LOGO_USAGE_EVERYTHING) {
      onChange([LOGO_USAGE_EVERYTHING]);
      return;
    }
    const withoutEverything = value.filter((v) => v !== LOGO_USAGE_EVERYTHING);
    if (withoutEverything.includes(opt)) {
      onChange(withoutEverything.filter((v) => v !== opt));
    } else {
      onChange([...withoutEverything, opt]);
    }
  };

  const remove = (opt: string) => onChange(value.filter((v) => v !== opt));

  return (
    <div ref={rootRef} className="relative">
      <span className="marologo-field-label mb-[10px] block">Përdorimi *</span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="marologo-card flex min-h-[52px] w-full flex-wrap items-center gap-[10px] px-[20px] py-[10px] text-left"
      >
        {value.length === 0 ? (
          <span className="px-1 text-[14px] text-ink-3">Zgjedh përdorimin</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              className="inline-flex min-h-8 items-center gap-[10px] rounded-maro12 bg-ink px-[12px] text-[13px] font-medium text-white"
            >
              {v}
              <button
                type="button"
                aria-label={`Hiq ${v}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v);
                }}
                className="rounded-full p-0.5 hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-ink-3" />
      </button>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}

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
          <ul className="max-h-56 space-y-[10px] overflow-y-auto">
            {filtered.map((opt) => {
              const active = value.includes(opt);
              return (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => toggle(opt)}
                    className={cn(
                      "flex min-h-[44px] w-full items-center justify-between rounded-maro12 px-[20px] text-left text-[14px] hover:bg-surface-2",
                      active && "bg-brand/10"
                    )}
                  >
                    {opt}
                    {active && <Check className="h-4 w-4 text-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
