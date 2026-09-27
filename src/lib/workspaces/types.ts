export interface WorkspaceBrand {
  name?: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export const DEFAULT_WORKSPACE_BRAND: WorkspaceBrand = {
  primaryColor: "#253FDA",
  secondaryColor: "#0B0B0B",
  backgroundColor: "#FFFFFF",
  textColor: "#0B0B0B",
};

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  iconUrl: string | null;
  sortOrder: number;
  createdAt: string;
  brand?: WorkspaceBrand;
}

export const MAX_WORKSPACES = 5;

export const DEFAULT_WORKSPACE_NAME = "Maro Workspace #1";
