import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";

/** Auth notifications may hold the session lock. Run consumers after it is released. */
export function subscribeToSession(
  auth: SupabaseClient["auth"],
  onSession: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const pending = new Set<ReturnType<typeof setTimeout>>();
  let active = true;
  const { data } = auth.onAuthStateChange((event, session) => {
    const timer = setTimeout(() => {
      pending.delete(timer);
      if (active) onSession(event, session);
    }, 0);
    pending.add(timer);
  });
  return () => {
    active = false;
    data.subscription.unsubscribe();
    pending.forEach(clearTimeout);
    pending.clear();
  };
}
