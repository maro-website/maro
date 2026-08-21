"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { cn } from "@/lib/utils/cn";
import { MaroSymbol } from "@/components/ui/Logo";
import { useSettings } from "@/lib/hooks/useSettings";
import { Sparkles, ArrowUp, PanelLeftClose, Loader2, Coins } from "lucide-react";

const THINKING_PHRASES = [
  "Po e analizoj kërkesën…",
  "Po planifikoj ndryshimet…",
  "Po e ndreq dizajnin…",
  "Po i rregulloj detajet…",
  "Pothuajse gati…",
];

// Rotating "thinking" label so the wait doesn't feel static.
function ThinkingBubble({ content }: { content: string }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % THINKING_PHRASES.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {THINKING_PHRASES[i] || content}
    </span>
  );
}

export function ChatPanel({ onCollapse }: { onCollapse: () => void }) {
  const { project, sendChat, sending } = useEditor();
  const { pricing } = useSettings();
  const editCost = pricing.editCost ?? 2;
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const messages = project.conversation.messages;

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const submit = () => {
    if (!input.trim() || sending) return;
    sendChat(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex h-11 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
          <Sparkles className="h-4 w-4 text-brand" /> maro AI
        </div>
        <button
          onClick={onCollapse}
          className="grid h-7 w-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="mt-2 rounded-2xl bg-surface p-4">
            <div className="flex items-start gap-2.5">
              <MaroSymbol className="mt-0.5 h-6 w-6" />
              <p className="text-[13px] leading-relaxed text-ink-2">
                {project.renderMode === "html" ? (
                  <>
                    Website-i është gati. Një ndryshim me maro AI kushton njësoj si gjenerimi i një website-i të ri.
                    Për ndryshime të vogla, të sugjerojmë <strong>Kodi</strong> në të djathtë — editimet manuale janë falas.
                  </>
                ) : (
                  <>
                    Website-i është gati. Mundesh me më tregu çka dëshiron me ndryshu, ose kliko direkt mbi elementet
                    në website.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <MaroSymbol className="mt-0.5 h-6 w-6 shrink-0" />
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed",
                  m.status === "thinking" ? "text-ink-3" : "text-ink-2"
                )}
              >
                {m.status === "thinking" ? (
                  <ThinkingBubble content={m.content} />
                ) : (
                  m.content
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div className="shrink-0 p-3">
        <div className="flex items-end gap-2 rounded-xl bg-surface p-1.5 pl-3 transition-colors focus-within:ring-2 focus-within:ring-ink/10">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Çka don me ndryshu?"
            className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-3"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || sending}
            aria-label={`Dërgo ndryshimin, ${editCost} kredite`}
            title={`Ky ndryshim me AI kushton ${editCost} kredite`}
            className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-brand px-2 text-white transition-all hover:bg-brand-hover disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            <span className="h-4 w-px bg-white/30" />
            <Coins className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold">{editCost}</span>
          </button>
        </div>
        <div className="mt-2 text-center text-[10.5px] text-ink-3">
          AI: {editCost} kredite për ndryshim · editimet manuale janë falas
        </div>
      </div>
    </div>
  );
}
