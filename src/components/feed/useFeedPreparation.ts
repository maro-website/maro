"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { draftAttachments, feedDraftKey, loadFeedDraft, saveFeedDraft, type FeedDraft, type PendingFeedRequest } from "@/lib/feed/draft";
import { checkFeedRequest, feedMessage } from "@/lib/feed/client";
import type { FeedView } from "@/lib/feed/model";
import { uploadOrResolvePrivateAttachment, type PrivateImageAttachment } from "@/lib/services/privateImageAttachment";

export type FeedPreparationState = Omit<FeedDraft, "version" | "updatedAt" | "attachments" | "pending"> & { attachments: PrivateImageAttachment[] };
type Options = { enabled: boolean; userId: string; workspaceId: string; state: FeedPreparationState;
  restore: (draft: FeedDraft, attachments: PrivateImageAttachment[]) => void; recovered: (feed: FeedView) => void; error: (message: string) => void };

/** Session-only, account/workspace-scoped recovery. A lost response always reuses its original request ID. */
export function useFeedPreparation(options: Options) {
  const { enabled, userId, workspaceId } = options;
  const latest = useRef(options); useEffect(() => { latest.current = options; });
  const [ready, setReady] = useState(!enabled), [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<PendingFeedRequest | null>(null), pendingRef = useRef<PendingFeedRequest | null>(null);
  const [checking, setChecking] = useState(false), [needsCheck, setNeedsCheck] = useState(false);
  const changePending = useCallback((value: PendingFeedRequest | null) => { pendingRef.current = value; setPending(value); }, []);
  const persist = useCallback((state: FeedPreparationState, value: PendingFeedRequest | null) => {
    try { const stored = saveFeedDraft(sessionStorage, userId, workspaceId, { ...state, version: 1, updatedAt: Date.now(), attachments: draftAttachments(state.attachments), pending: value }); setSaved(stored); }
    catch { setSaved(false); }
  }, [userId, workspaceId]);
  useEffect(() => {
    if (!enabled) { setReady(true); return; }
    let active = true;
    void (async () => {
      let draft: FeedDraft | null = null;
      try { draft = loadFeedDraft(sessionStorage, userId, workspaceId); } catch { /* Storage can be disabled. */ }
      if (draft) {
        const restored = await Promise.all(draft.attachments.map(async item => {
          const attachment: PrivateImageAttachment = { ...item, previewUrl: "", status: "upload-error", error: "Ngarkimi u ndërpre. Hiqe dhe ngarkoje përsëri." };
          if (!item.storageRef) return attachment;
          try { return await uploadOrResolvePrivateAttachment({ ...attachment, status: "preview-error" }); }
          catch { return { ...attachment, status: "preview-error" as const, error: "Pamja private nuk u hap. Rihape foton." }; }
        }));
        if (!active) return;
        latest.current.restore(draft, restored); changePending(draft.pending);
        if (draft.pending) setNeedsCheck(true);
        setSaved(true);
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [enabled, userId, workspaceId, changePending]);
  const signature = JSON.stringify({ ...options.state, attachments: draftAttachments(options.state.attachments) });
  useEffect(() => {
    if (!enabled || !ready) return;
    const timer = setTimeout(() => persist(latest.current.state, pendingRef.current), 300);
    return () => clearTimeout(timer);
  }, [enabled, ready, signature, pending, persist]);
  useEffect(() => {
    if (!enabled || !ready) return;
    const flush = () => persist(latest.current.state, pendingRef.current);
    const hidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", hidden); };
  }, [enabled, ready, persist]);
  useEffect(() => {
    if (!enabled || !ready || !pending || !needsCheck) return;
    let active = true, timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const check = async () => {
      setChecking(true);
      try {
        const result = await checkFeedRequest(`/api/feed?workspaceId=${encodeURIComponent(workspaceId)}&requestId=${pending.requestId}`, controller.signal);
        if (!active) return;
        if (result.feed) { changePending(null); setNeedsCheck(false); persist(latest.current.state, null); latest.current.recovered(result.feed); setChecking(false); return; }
        if (result.preparation.state === "running" && Date.now() - pending.startedAt < 180_000) { timer = setTimeout(() => void check(), 6000); return; }
        if (result.preparation.state === "failed") { changePending(null); persist(latest.current.state, null); latest.current.error(feedMessage(result.preparation.error ?? "feed_plan_invalid")); }
        if (result.preparation.state === "interrupted") latest.current.error(feedMessage("feed_preparation_interrupted"));
        // Missing/prepared/uncertain responses may be retried explicitly with the SAME ID, never a new charge.
        setNeedsCheck(false); setChecking(false);
      } catch { if (active) { setChecking(false); setNeedsCheck(false); latest.current.error("Nuk u verifikua kërkesa e fundit. Mundesh me e kontrollu ose me e riprovu; ruhet e njëjta kërkesë."); } }
    };
    void check(); return () => { active = false; controller.abort(); if (timer) clearTimeout(timer); };
  }, [enabled, ready, pending, needsCheck, workspaceId, changePending, persist]);
  const begin = useCallback((state: FeedPreparationState) => {
    const value = { requestId: pendingRef.current?.requestId ?? crypto.randomUUID(), startedAt: Date.now() };
    changePending(value); setNeedsCheck(false); persist(state, value); return value.requestId;
  }, [changePending, persist]);
  const finish = useCallback(() => { changePending(null); setNeedsCheck(false); setChecking(false); persist(latest.current.state, null); }, [changePending, persist]);
  const failed = useCallback(() => { if (pendingRef.current) setNeedsCheck(true); }, []);
  const check = useCallback(() => setNeedsCheck(true), []);
  const clear = useCallback(() => { if (pendingRef.current) return; try { sessionStorage.removeItem(feedDraftKey(userId, workspaceId)); } catch { /* Not a prerequisite to reset fields. */ } setSaved(false); }, [userId, workspaceId]);
  return { ready, saved, pending, checking, begin, finish, failed, check, clear };
}
