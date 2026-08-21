import { getAccessToken, getSupabaseBrowser } from "@/lib/supabase/client";

export const MAX_PROJECT_ASSET_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_REFERENCE_FILE_BYTES = 25 * 1024 * 1024;

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

export type UploadedProjectAsset = { url: string; storageRef: string };

async function directUploadPrivateImage(
  file: File,
  purpose: "project-asset" | "image-reference"
): Promise<UploadedProjectAsset> {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  const prepare = await fetch("/api/projects/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "prepare", purpose, name: file.name, type: file.type, size: file.size }),
  });
  const prepared = (await prepare.json().catch(() => ({}))) as {
    path?: string;
    uploadToken?: string;
    storageRef?: string;
    error?: string;
  };
  if (!prepare.ok || !prepared.path || !prepared.uploadToken || !prepared.storageRef) {
    throw new Error(prepared.error ?? "upload-failed");
  }

  const { error: uploadError } = await getSupabaseBrowser()
    .storage.from("generations")
    .uploadToSignedUrl(prepared.path, prepared.uploadToken, file, {
      contentType: file.type,
      cacheControl: "31536000",
    });
  if (uploadError) throw new Error("upload-failed");

  const finalize = await fetch("/api/projects/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "finalize", purpose, storageRef: prepared.storageRef }),
  });
  const completed = (await finalize.json().catch(() => ({}))) as UploadedProjectAsset & { error?: string };
  if (!finalize.ok || !completed.url || !completed.storageRef) {
    throw new Error(completed.error ?? "upload-failed");
  }
  return completed;
}

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
  if (!/^image\/(?:png|jpe?g|webp)$/i.test(file.type)) throw new Error("invalid-file-type");
  if (file.size > MAX_PROJECT_ASSET_FILE_BYTES) throw new Error("file-too-large");
  return directUploadPrivateImage(file, "project-asset");
}

export async function uploadImageReference(file: File): Promise<UploadedProjectAsset> {
  if (!/^image\/(?:png|jpe?g|webp)$/i.test(file.type)) throw new Error("invalid-file-type");
  if (file.size > MAX_IMAGE_REFERENCE_FILE_BYTES) throw new Error("file-too-large");
  return directUploadPrivateImage(file, "image-reference");
}

export async function uploadImageReferenceDataUrl(dataUrl: string, name = "reference"): Promise<UploadedProjectAsset> {
  if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(dataUrl)) throw new Error("invalid-file-type");
  const blob = await (await fetch(dataUrl)).blob();
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  return uploadImageReference(new File([blob], `${name}.${extension}`, { type: blob.type }));
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

export async function resolvePrivateAssetRefsStrict(refs: string[]): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  if (refs.length === 0) return {};
  const response = await fetch("/api/media/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ refs }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    urls?: Record<string, string>;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? "preview-resolve-failed");
  const urls = payload.urls ?? {};
  if (refs.some((ref) => !/^https?:\/\//i.test(urls[ref] ?? ""))) {
    throw new Error("preview-resolve-failed");
  }
  return urls;
}

export function projectAssetErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "upload-failed";
  if (code === "file-too-large" || code === "file_too_large" || code === "too-large") {
    return "Imazhi është tepër i madh. Për referenca përdor një PNG, JPG ose WebP deri në 25 MB.";
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
