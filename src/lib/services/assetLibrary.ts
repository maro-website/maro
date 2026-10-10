import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";
import { getAccessToken } from "@/lib/supabase/client";
import { notifyStorageChanged } from "@/lib/workspaces/accountPolicy";

export type UploadedLibraryAsset = { storageRef: string; url: string; name: string; createdAt: string; bytes: number };
export type LibrarySelection = { storageRef: string; url: string; name: string };
export type LibraryAssetMetadata = { storageRef: string; bytes: number | null };

export async function fetchAssetMetadata(refs: string[], signal?: AbortSignal): Promise<LibraryAssetMetadata[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  const assets: LibraryAssetMetadata[] = [];
  for (let offset = 0; offset < refs.length; offset += 50) {
    const response = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ refs: refs.slice(offset, offset + 50) }), signal });
    if (!response.ok) throw new Error("asset-metadata-unavailable");
    const result: { assets: LibraryAssetMetadata[] } = await response.json();
    assets.push(...result.assets);
  }
  return assets;
}

export async function deleteUploadedAsset(storageRef: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  const response = await fetch("/api/assets", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ storageRef }) });
  if (!response.ok) throw new Error("asset-delete-failed");
  notifyStorageChanged();
}

export function assetFilename(value: string | undefined, fallback: string): string {
  if (!value || /^(?:data|blob):/.test(value)) return fallback;
  try {
    const path = value.startsWith("storage:") ? value : new URL(value).pathname;
    return decodeURIComponent(path.split("/").pop() || "") || fallback;
  } catch { return fallback; }
}

export function formatAssetBytes(bytes: number | null | undefined): string {
  if (!bytes || !Number.isFinite(bytes) || bytes < 0) return "Pa madhësi";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Number((bytes / 1024 ** unit).toFixed(unit ? 1 : 0))} ${units[unit]}`;
}

export async function fetchUploadedAssets(offset = 0, signal?: AbortSignal): Promise<{ assets: UploadedLibraryAsset[]; nextOffset: number | null }> {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  const response = await fetch(`/api/assets?offset=${offset}`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) throw new Error("asset-library-unavailable");
  return response.json();
}

/** Only canonical private references owned by the current account can be attached. */
export function ownedLibraryReference(ref: string | undefined, userId: string | undefined): ref is string {
  if (!ref || !userId || !ref.startsWith(`storage:generations/${userId}/`)) return false;
  const path = ref.slice("storage:generations/".length);
  return !/[\\%?#\u0000-\u001f\u007f]/.test(path) && path.split("/").every(part => part && part !== "." && part !== "..");
}

export function libraryStorageRef(value: string | undefined, userId: string | undefined): string | null {
  if (ownedLibraryReference(value, userId)) return value;
  try {
    const url = new URL(value ?? "");
    if (url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin) return null;
    const path = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public)\/generations\/(.+)$/)?.[1];
    const ref = path ? `storage:generations/${decodeURIComponent(path)}` : undefined;
    return ownedLibraryReference(ref, userId) ? ref : null;
  } catch { return null; }
}
