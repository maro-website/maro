"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { cn } from "@/lib/utils/cn";
import { MaroSymbol } from "@/components/ui/Logo";
import { Sparkles, ArrowUp, PanelLeftClose, Loader2 } from "lucide-react";

const SUGGESTIONS = [
  "Bëje hero-n më premium",
  "Shto një pricing section",
  "Bëje website-in më minimal",
  "Ndrysho stilin e butonave",
];

export function ChatPanel({ onCollapse }: { onCollapse: () => void }) {
  const { project, sendChat, sending } = useEditor();
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
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
          <Sparkles className="h-4 w-4 text-brand" /> Maro AI
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
          <div className="mt-2 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start gap-2.5">
              <MaroSymbol className="mt-0.5 h-6 w-6" />
              <p className="text-[13px] leading-relaxed text-ink-2">
                Website-i është gati. Mundesh me më tregu çka dëshiron me ndryshu, ose kliko direkt
                mbi elementet në website.
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
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-line bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed",
                  m.status === "thinking" ? "text-ink-3" : "text-ink-2"
                )}
              >
                {m.status === "thinking" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {m.content}
                  </span>
                ) : (
                  m.content
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div className="shrink-0 border-t border-line p-3">
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendChat(s)}
                disabled={sending}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2 transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface p-1.5 pl-3 transition-colors focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
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
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white transition-all hover:bg-brand-hover disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 text-center text-[10.5px] text-ink-3">
          AI actions përdorin kredite · edite manuale janë falas
        </div>
      </div>
    </div>
  );
}
