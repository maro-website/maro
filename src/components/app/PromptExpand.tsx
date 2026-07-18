"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, ArrowUp, X } from "lucide-react";

// Fullscreen "text board" for writing longer prompts comfortably. Bound to the
// same prompt state as the composer's textarea.
export function PromptExpand({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  placeholder,
  canSubmit = true,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  canSubmit?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, onSubmit]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-canvas"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex h-full w-full max-w-3xl flex-col px-5 py-5 sm:py-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink-2">Redakto promptin</span>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Mbyll"
                title="Zvogëlo"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <textarea
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="min-h-0 flex-1 w-full resize-none rounded-3xl border border-line bg-surface p-5 text-[17px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12.5px] text-ink-3">{value.trim().length} shkronja</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
                >
                  <X className="h-4 w-4" /> Mbyll
                </button>
                {onSubmit && (
                  <button
                    onClick={onSubmit}
                    disabled={!canSubmit || !value.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Gjenero <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
