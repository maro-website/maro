import type { WorkspaceBrainProfile } from "./brainTypes";
import { normalizeBrainProfile } from "./brainProfile";

function key(userId: string, workspaceId: string) {
  return `maro:brain-draft:${userId}:${workspaceId}`;
}

export function readBrainDraft(userId: string, workspaceId: string): WorkspaceBrainProfile | null {
  try {
    const raw = localStorage.getItem(key(userId, workspaceId));
    return raw ? normalizeBrainProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeBrainDraft(userId: string, workspaceId: string, profile: WorkspaceBrainProfile): boolean {
  try {
    localStorage.setItem(key(userId, workspaceId), JSON.stringify(profile));
    return true;
  } catch {
    return false;
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
