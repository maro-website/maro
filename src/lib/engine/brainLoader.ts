import "server-only";

import {
  getWorkspaceBrainProfile,
  getWorkspaceSources,
} from "@/lib/supabase/server";
import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import type { BrainLoadResult } from "./types";

export interface LoadBrainContextInput {
  /** Workspace owner user id — required for isolation. */
  ownerUserId: string;
  workspaceId: string;
  /** When true, admin is inspecting — still requires explicit owner+workspace pair. */
  adminInspection?: boolean;
}

/**
 * Load real maroBrain data using the same production services.
 * Enforces owner_id match on workspace — no cross-user leakage.
 */
export async function loadBrainContext(input: LoadBrainContextInput): Promise<BrainLoadResult> {
  const { ownerUserId, workspaceId } = input;
  if (!ownerUserId?.trim() || !workspaceId?.trim()) {
    return {
      profile: null,
      sources: [],
      workspaceId: null,
      ownerUserId: null,
      loaded: false,
      isolationOk: false,
      error: "missing_owner_or_workspace",
    };
  }

  const profile = await getWorkspaceBrainProfile(ownerUserId, workspaceId);
  if (!profile) {
    return {
      profile: null,
      sources: [],
      workspaceId,
      ownerUserId,
      loaded: false,
      isolationOk: true,
      error: "workspace_not_found_or_not_owned",
    };
  }

  const sources = await getWorkspaceSources(ownerUserId, workspaceId);

  return {
    profile,
    sources,
    workspaceId,
    ownerUserId,
    loaded: true,
    isolationOk: true,
  };
}

export type { WorkspaceBrainProfile, WorkspaceSource };
