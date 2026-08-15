export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  iconUrl: string | null;
  sortOrder: number;
  createdAt: string;
}

export const MAX_WORKSPACES = 5;

export const DEFAULT_WORKSPACE_NAME = "Maro Workspace #1";
