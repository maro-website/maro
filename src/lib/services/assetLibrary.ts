import { getAccessToken } from "@/lib/supabase/client";

export type UploadedLibraryAsset = { storageRef: string; url: string; name: string; createdAt: string; bytes: number };
export type LibrarySelection = { storageRef: string; url: string; name: string };

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
