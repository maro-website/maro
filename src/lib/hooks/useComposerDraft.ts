"use client";

import * as React from "react";
import { currentComposerDraft, emptyComposerDraft, loadComposerDraft, saveComposerDraft, subscribeComposerDraft, type ComposerDraft } from "@/lib/services/composerDraft";

export function useComposerDraft(key: string) {
  const activeKey = React.useRef(key);
  activeKey.current = key;
  // Keep the server and first client render identical; restore browser data before paint.
  const [snapshot, setSnapshot] = React.useState(() => ({ key, draft: emptyComposerDraft() }));
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  React.useLayoutEffect(() => {
    setSnapshot({ key, draft: currentComposerDraft(key) });
    let alive = true;
    const unsubscribe = subscribeComposerDraft(key, draft => { if (alive) setSnapshot({ key, draft }); });
    void loadComposerDraft(key).then(draft => { if (alive) { setSnapshot({ key, draft }); setLoadedKey(key); } });
    return () => { alive = false; unsubscribe(); };
  }, [key]);

  const update = React.useCallback(<K extends keyof ComposerDraft>(field: K, value: React.SetStateAction<ComposerDraft[K]>) => {
    const current = currentComposerDraft(key);
    const next = { ...current, [field]: typeof value === "function"
      ? (value as (previous: ComposerDraft[K]) => ComposerDraft[K])(current[field]) : value };
    saveComposerDraft(key, next);
    // An upload finishing after a tool/workspace change belongs to its original draft.
    if (activeKey.current === key) setSnapshot({ key, draft: next });
  }, [key]);
  const setters = React.useMemo(() => ({
    setPrompt: (value: React.SetStateAction<ComposerDraft["prompt"]>) => update("prompt", value),
    setAttachments: (value: React.SetStateAction<ComposerDraft["attachments"]>) => update("attachments", value),
    setPrivateImageAttachments: (value: React.SetStateAction<ComposerDraft["privateImageAttachments"]>) => update("privateImageAttachments", value),
    setAudioInput: (value: React.SetStateAction<ComposerDraft["audioInput"]>) => update("audioInput", value),
    setPromptAttachInternal: (value: React.SetStateAction<ComposerDraft["promptAttach"]>) => update("promptAttach", value),
  }), [update]);
  return { ...(snapshot.key === key ? snapshot.draft : currentComposerDraft(key)), ...setters, draftReady: loadedKey === key };
}
