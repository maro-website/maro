"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, ArrowUp, X } from "lucide-react";
import { useDialogFocus } from "@/components/ui/useDialogFocus";
import { Button } from "@/components/ui/Button";

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
  maxChars,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  canSubmit?: boolean;
  maxChars?: number;
}) {
  const overLimit = maxChars !== undefined && value.length > maxChars;
  const submitAllowed = canSubmit && !overLimit && Boolean(value.trim());
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => setMounted(true), []);
  useDialogFocus(mounted && open, dialogRef, onClose);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!e.repeat && submitAllowed) onSubmit?.(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, onSubmit, submitAllowed]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Redakto promptin"
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--maro-z-dialog)] bg-canvas"
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
                className="maro-icon-button text-ink-2"
                aria-label="Mbyll"
                title="Zvogëlo"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <textarea
              aria-label="Prompti"
              aria-invalid={overLimit}
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="min-h-0 flex-1 w-full resize-none rounded-maro16 bg-surface p-5 text-base leading-relaxed text-ink placeholder:text-ink-3"
            />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-ink-3">{value.length.toLocaleString("en-US")}{maxChars !== undefined ? ` / ${maxChars.toLocaleString("en-US")}` : ""} shkronja{overLimit && " · Shkurto promptin për të gjeneruar."}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" icon={<X className="h-4 w-4" />}
                  onClick={onClose}
                >
                  Mbyll
                </Button>
                {onSubmit && (
                  <Button variant="brand" iconRight={<ArrowUp className="h-4 w-4" />}
                    onClick={onSubmit}
                    disabled={!submitAllowed}
                  >
                    Gjenero
                  </Button>
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
