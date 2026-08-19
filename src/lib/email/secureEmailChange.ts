import type { AuthEmailChangeRecipientRole } from "./types";

export interface SupabaseAuthHookUser {
  id?: string;
  email?: string;
  new_email?: string;
}

export interface SupabaseAuthHookEmailData {
  token?: string;
  token_hash?: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
}

export interface SupabaseAuthHookPayload {
  user: SupabaseAuthHookUser;
  email_data: SupabaseAuthHookEmailData;
}

export interface EmailChangeDelivery {
  recipient: string;
  recipientRole: AuthEmailChangeRecipientRole;
  tokenHash: string;
}

function hasSecureEmailChangeTokens(data: SupabaseAuthHookEmailData): boolean {
  return Boolean(data.token_hash_new || data.token_new);
}

/**
 * Resolve Secure Email Change delivery for a single hook invocation.
 *
 * Supabase compatibility mapping (do NOT invert):
 * - CURRENT inbox (user.email): token + token_hash_new → use token_hash_new
 * - NEW inbox (user.new_email): token_new + token_hash → use token_hash
 *
 * Non-secure mode sends one email to the new address with the available hash.
 */
export function resolveEmailChangeDelivery(
  payload: SupabaseAuthHookPayload
): EmailChangeDelivery | null {
  const user = payload.user ?? {};
  const data = payload.email_data ?? {};

  const currentEmail = user.email?.trim() ?? "";
  const newEmail = user.new_email?.trim() ?? "";

  if (hasSecureEmailChangeTokens(data)) {
    const hasCurrentHash = Boolean(data.token_hash_new?.trim());
    const hasNewHash = Boolean(data.token_hash?.trim());

    if (hasCurrentHash && !hasNewHash && currentEmail) {
      return {
        recipient: currentEmail,
        recipientRole: "current",
        tokenHash: data.token_hash_new!.trim(),
      };
    }

    if (hasNewHash && !hasCurrentHash && newEmail) {
      return {
        recipient: newEmail,
        recipientRole: "new",
        tokenHash: data.token_hash!.trim(),
      };
    }

    // Separate hook calls may include only the relevant pair — prefer explicit mapping.
    if (hasCurrentHash && currentEmail && (!hasNewHash || !newEmail)) {
      return {
        recipient: currentEmail,
        recipientRole: "current",
        tokenHash: data.token_hash_new!.trim(),
      };
    }

    if (hasNewHash && newEmail) {
      return {
        recipient: newEmail,
        recipientRole: "new",
        tokenHash: data.token_hash!.trim(),
      };
    }

    return null;
  }

  const recipient = newEmail || currentEmail;
  const tokenHash = data.token_hash?.trim() || data.token_hash_new?.trim() || "";
  if (!recipient || !tokenHash) return null;

  return {
    recipient,
    recipientRole: "new",
    tokenHash,
  };
}
