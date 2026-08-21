import { getAccessToken } from "@/lib/supabase/client";

export const MAX_PROJECT_ASSET_FILE_BYTES = 5 * 1024 * 1024;

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

export type UploadedProjectAsset = { url: string; storageRef: string };

export function legacyProjectAssetStorageRef(value: string): string | null {
  const marker = "/storage/v1/object/public/generations/public/project-assets/";
  try {
    const parsed = new URL(value);
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
      : null;
    if (configured && parsed.origin !== configured.origin) return null;
    if (!parsed.pathname.startsWith(marker)) return null;
    const objectPath = decodeURIComponent(parsed.pathname.slice(marker.length));
    const [owner, ...rest] = objectPath.split("/");
    if (!owner || rest.length === 0 || objectPath.includes("..")) return null;
    return `storage:generations/${owner}/project-assets/${rest.join("/")}`;
  } catch {
    return null;
  }
}

async function uploadProjectAssetDataUrlInternal(dataUrl: string): Promise<UploadedProjectAsset> {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  const response = await fetch("/api/projects/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dataUrl }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    storageRef?: string;
    error?: string;
  };
  if (!response.ok || !payload.url || !payload.storageRef) {
    throw new Error(payload.error ?? "upload-failed");
  }
  return { url: payload.url, storageRef: payload.storageRef };
}

export async function uploadProjectAsset(file: File): Promise<UploadedProjectAsset> {
  if (!file.type.startsWith("image/")) throw new Error("invalid-file-type");
  if (file.size > MAX_PROJECT_ASSET_FILE_BYTES) throw new Error("file-too-large");
  return uploadProjectAssetDataUrlInternal(await fileAsDataUrl(file));
}

/** Upload a composer preview that has already been read as a data URL. */
export async function uploadProjectAssetDataUrl(dataUrl: string): Promise<string> {
  if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(dataUrl)) {
    throw new Error("invalid-file-type");
  }
  return (await uploadProjectAssetDataUrlInternal(dataUrl)).storageRef;
}

export async function resolvePrivateAssetRefs(refs: string[]): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token || refs.length === 0) return {};
  const response = await fetch("/api/media/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ refs }),
  });
  if (!response.ok) return {};
  const payload = (await response.json().catch(() => ({}))) as { urls?: Record<string, string> };
  return payload.urls ?? {};
}

export function projectAssetErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "upload-failed";
  if (code === "file-too-large" || code === "file_too_large" || code === "too-large") {
    return "Imazhi duhet të jetë maksimumi 5 MB.";
  }
  if (
    code === "invalid-file-type" ||
    code === "unsupported-format" ||
    code === "unsupported_mime" ||
    code === "invalid_data_url" ||
    code === "invalid_magic_bytes" ||
    code === "mime_mismatch"
  ) {
    return "Zgjidh një imazh PNG, JPG ose WebP.";
  }
  if (code === "storage_quota_exceeded") return "Ke arritur kuotën falas prej 500 MB për imazhet e website-eve.";
  if (code === "unauthorized") return "Kyçu përsëri për ta ngarkuar imazhin.";
  return "Imazhi nuk u ngarkua. Provo përsëri.";
}
