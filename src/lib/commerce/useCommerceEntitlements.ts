"use client";

import { useEffect, useState } from "react";
import { useMaro } from "@/context/store";
import { fetchCommerceEntitlements, type CommerceEntitlementsPayload } from "./client";

export interface CommerceEntitlementsState {
  data: CommerceEntitlementsPayload | null;
  loading: boolean;
  error: boolean;
}

export function useCommerceEntitlements(): CommerceEntitlementsState {
  const { user, profile, getAccessToken } = useMaro();
  const userId = user?.id;
  const [state, setState] = useState<CommerceEntitlementsState & { userId?: string }>({ data: null, loading: true, error: false });
  useEffect(() => {
    const controller = new AbortController();
    setState({ userId, data: null, loading: Boolean(userId), error: false });
    if (userId) void (async () => {
      try {
        const data = await fetchCommerceEntitlements(await getAccessToken(), controller.signal);
        if (!controller.signal.aborted) setState({ userId, data, loading: false, error: false });
      } catch {
        if (!controller.signal.aborted) setState({ userId, data: null, loading: false, error: true });
      }
    })();
    return () => controller.abort();
  }, [userId, profile?.maro_plan, getAccessToken]);
  return state.userId === userId ? state : { data: null, loading: Boolean(userId), error: false };
}
