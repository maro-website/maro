"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import s from "./CaseStudies.module.css";

export function PromptBlock({ prompt, number }: { prompt: string; number: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setStatus("copied"); }
    catch { setStatus("error"); }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  }
  return <div className={s.promptBlock}><div className={s.promptHeader}><span className={s.eyebrow}>PROMPT {number} <span className={s.muted}>/ I PANDRYSHUAR</span></span><button type="button" onClick={() => void copy()} aria-label={`Copy prompt ${number}`}>{status === "copied" ? <Check size={15} /> : <Copy size={15} />}<span aria-live="polite">{status === "copied" ? "U kopjua" : "Copy prompt"}</span></button></div><pre>{prompt}</pre>{status === "error" && <p role="status">Kopjimi nuk u lejua. Përzgjidh tekstin e promptit për ta kopjuar.</p>}</div>;
}
