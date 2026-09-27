import type { SupabaseClient } from "@supabase/supabase-js";
import { authErrorMessage } from "./messages";

/** Supabase validates the live session and applies the password policy/MFA rules. */
export async function completePasswordReset(client: SupabaseClient, password: string): Promise<string | null> {
  try {
    const verified = await client.auth.getUser();
    if (verified.error || !verified.data.user) return "Sesioni ka skaduar. Kërko një link të ri.";
    const updated = await client.auth.updateUser({ password });
    if (updated.error) return authErrorMessage(updated.error.code);
    const signedOut = await client.auth.signOut();
    if (signedOut.error) return "Fjalëkalimi u ndryshua. Dil nga llogaria dhe hyr përsëri.";
    return null;
  } catch { return authErrorMessage(); }
}
