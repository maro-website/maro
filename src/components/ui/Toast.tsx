"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "info" | "error";
interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const toast = React.useCallback((message: string, tone: ToastTone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const icons = {
    success: <Check className="h-4 w-4 text-success" />,
    info: <Info className="h-4 w-4 text-info" />,
    error: <AlertTriangle className="h-4 w-4 text-danger" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed bottom-[20px] left-1/2 z-[200] flex w-[calc(100%_-_40px)] max-w-md -translate-x-1/2 flex-col items-center gap-[10px]">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto flex w-full items-center gap-[10px] rounded-maro16 bg-surface p-[20px] animate-fade-up"
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-md",
                    t.tone === "success" && "bg-success/10",
                    t.tone === "info" && "bg-info/10",
                    t.tone === "error" && "bg-danger/10"
                  )}
                >
                  {icons[t.tone]}
                </span>
                <span className="text-[13px] font-medium text-ink">{t.message}</span>
                <button
                  onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                  className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-maro12 text-ink-3 hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}
