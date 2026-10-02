import type { WorkspaceBrainProfile } from "./brainTypes";
import { isBrainConfigured, normalizeBrainProfile } from "./brainProfile";

function key(userId: string, workspaceId: string) {
  return `maro:brain-draft:${userId}:${workspaceId}`;
}

export function readBrainDraft(userId: string, workspaceId: string, resetAt?: string | null): WorkspaceBrainProfile | null {
  try {
    const raw = localStorage.getItem(key(userId, workspaceId));
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (resetAt && (stored.resetAt !== resetAt || !stored.savedAt || Date.parse(stored.savedAt) <= Date.parse(resetAt))) {
      localStorage.removeItem(key(userId, workspaceId));
      return null;
    }
    return normalizeBrainProfile(stored.profile ?? stored);
  } catch {
    return null;
  }
}

export function writeBrainDraft(userId: string, workspaceId: string, profile: WorkspaceBrainProfile, resetAt?: string | null): boolean {
  try {
    localStorage.setItem(key(userId, workspaceId), JSON.stringify({ profile, savedAt: new Date().toISOString(), resetAt: resetAt ?? null }));
    return true;
  } catch {
    return false;
  }
}

/** Older failed saves cached the profile locally before the server confirmed it.
 * Call only after the server has confirmed this workspace belongs to the user.
 */
export function recoverLegacyBrainDraft(userId: string, workspaceId: string, serverProfile: WorkspaceBrainProfile, resetAt?: string | null) {
  if (resetAt) return null;
  if (isBrainConfigured(serverProfile)) return null;
  const recoveredKey = `${key(userId, workspaceId)}:legacy-recovered`;
  try {
    if (localStorage.getItem(recoveredKey)) return null;
    const raw = localStorage.getItem(`maro:ws-brain:${workspaceId}`);
    if (!raw) return null;
    const profile = normalizeBrainProfile(JSON.parse(raw));
    if (!isBrainConfigured(profile)) return null;
    if (writeBrainDraft(userId, workspaceId, profile)) localStorage.setItem(recoveredKey, "1");
    return profile;
  } catch {
    return null;
  }
}

/** A save of an older snapshot must not discard edits made while it was in flight. */
export function clearSavedBrainDraft(userId: string, workspaceId: string, saved: WorkspaceBrainProfile) {
  try {
    const draft = readBrainDraft(userId, workspaceId);
    if (draft && JSON.stringify(draft) === JSON.stringify(normalizeBrainProfile(saved))) {
      localStorage.removeItem(key(userId, workspaceId));
    }
  } catch {
    // Keeping a draft is safer than losing it when browser storage is unavailable.
  }
}
