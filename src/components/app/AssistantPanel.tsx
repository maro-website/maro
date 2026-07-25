"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { useMaro } from "@/context/store";
import { streamChat, ChatError, InsufficientCreditsError } from "@/lib/services/chatService";
import type { ChatMsg } from "@/lib/ai/chatTypes";
import { cn } from "@/lib/utils/cn";
import { uid } from "@/lib/utils/format";
import { ArrowUp, Copy, Check, Plus, X, MessageSquare, Sparkles } from "lucide-react";

const CHAT_ERRORS: Record<string, string> = {
  "no-key": "Asistenti nuk është konfiguruar në server ende.",
  unauthorized: "Sesioni skadoi. Hyr përsëri.",
  "ai-failed": "Asistenti nuk u përgjigj. Provo përsëri.",
  "missing-message": "Shkruaj një mesazh.",
};

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function AssistantPanel({
  toolId,
  onInsert,
  variant,
  onClose,
}: {
  toolId?: string;
  onInsert?: (text: string) => void;
  variant: "drawer" | "page";
  onClose?: () => void;
}) {
  const { toast } = useToast();
  const { user, spendCredits } = useMaro();
  const [items, setItems] = React.useState<ChatItem[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!user) {
      toast("Hyr për të përdorur maro Fjalë.");
      return;
    }

    const history: ChatMsg[] = items.map((m) => ({ role: m.role, content: m.content }));
    const assistantId = uid("a");
    setItems((prev) => [
      ...prev,
      { id: uid("u"), role: "user", content: text },
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setBusy(true);

    try {
      const { creditsSpent } = await streamChat(
        { toolId, messages: [...history, { role: "user", content: text }] },
        (delta) => {
          setItems((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m))
          );
        }
      );
      if (creditsSpent) spendCredits(creditsSpent);
      setItems((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
    } catch (err) {
      let msg = "Gabim i papritur. Provo përsëri.";
      if (err instanceof InsufficientCreditsError) {
        setShowBuy(true);
        msg = "Nuk ke kredite të mjaftueshme.";
      } else if (err instanceof ChatError) {
        msg = CHAT_ERRORS[err.code] || `Gabim (${err.code}).`;
      }
      toast(msg);
      setItems((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, streaming: false, content: m.content || `⚠️ ${msg}` }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[15px] font-extrabold text-ink">maro Fjalë</div>
            <div className="text-[12px] text-ink-3">Asistent shkrimi &amp; planifikimi</div>
          </div>
        </div>
        {variant === "drawer" && onClose && (
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Mbyll"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-thin px-4 py-4">
        {items.length === 0 ? (
          <EmptyState toolId={toolId} onPick={(q) => setInput(q)} />
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-brand px-4 py-2.5 text-[14.5px] leading-relaxed text-brand-fg">
                    {m.content}
                  </div>
                </div>
              ) : (
                <AssistantBubble key={m.id} item={m} onInsert={onInsert} />
              )
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Pyet maro Fjalë…"
            className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
          />
          <button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-brand-fg transition-all",
              !busy && input.trim() ? "bg-brand hover:bg-brand-hover" : "cursor-not-allowed bg-line-strong text-ink-3"
            )}
            aria-label="Dërgo"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-brand-fg" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={1} />
    </div>
  );

  if (variant === "page") {
    return <div className="mx-auto flex h-full w-full max-w-3xl flex-col">{body}</div>;
  }

  // Drawer: fixed right-side panel with overlay (portal).
  return <DrawerShell onClose={onClose}>{body}</DrawerShell>;
}

function DrawerShell({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 h-full w-full max-w-md border-l border-line bg-canvas shadow-pop"
      >
        {children}
      </motion.div>
    </div>,
    document.body
  );
}

function AssistantBubble({
  item,
  onInsert,
}: {
  item: ChatItem;
  onInsert?: (text: string) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Kopjimi dështoi.");
    }
  };
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/symbol.svg" alt="maro" className="h-7 w-7 rounded-lg" draggable={false} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="rounded-3xl rounded-tl-lg border border-line bg-surface px-4 py-3">
          {item.content ? (
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">
              {item.content}
              {item.streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand align-middle" />}
            </p>
          ) : (
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  className="h-2 w-2 animate-bounce rounded-full bg-ink-3"
                  style={{ animationDelay: `${n * 0.15}s` }}
                />
              ))}
            </span>
          )}
        </div>
        {!item.streaming && item.content && (
          <div className="mt-1.5 flex items-center gap-2 pl-1">
            {onInsert && (
              <button
                onClick={() => onInsert(item.content)}
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand transition-colors hover:text-brand-hover"
              >
                <Plus className="h-3.5 w-3.5" /> Shto në promptbox
              </button>
            )}
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-ink"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "U kopjua" : "Kopjo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS: Record<string, string[]> = {
  logo: [
    "Më jep 5 ide koncepti për logon e një brendi kafeje.",
    "Si ta përshkruaj një simbol minimalist për një klinikë dentare?",
  ],
  reklama: [
    "Ide për një product shot të një parfumi luksoz.",
    "Shkruaj një prompt për foto produkti të një kanaçeje pijeje.",
  ],
  website: [
    "Më ndihmo të strukturoj një landing page për një restorant.",
    "Shkruaj tekstin hero për një studio fotografike.",
  ],
};

function EmptyState({ toolId, onPick }: { toolId?: string; onPick: (q: string) => void }) {
  const ideas = (toolId && SUGGESTIONS[toolId]) || [
    "Më ndihmo të mendoj një ide për brendin tim.",
    "Shkruaj një prompt profesional për një imazh produkti.",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Sparkles className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-[17px] font-bold text-ink">Si mund të ndihmoj?</h3>
      <p className="mt-1 max-w-xs text-[13.5px] text-ink-2">
        Kërko ide, përmirëso tekstin, ose ndërto një prompt më të mirë.
      </p>
      <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
        {ideas.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-[13.5px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
