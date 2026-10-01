import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Primary object store — private by default (migration 0035). */
export const STORAGE_BUCKET = "generations";
export const PUBLIC_STORAGE_BUCKET = "maro-public";

/** Prefix for intentionally public assets (explore publishes, admin UI assets). */
export const PUBLIC_ASSET_PREFIX = "public/";

const INTENTIONALLY_PUBLIC_PREFIXES = [
  "public/explore/",
  "public/avatars/",
  "public/presets/",
  "admin-icons/",
  "admin-ads/",
] as const;

/** Signed URL lifetime for private user assets shown in the app UI (1 hour). */
export const PRIVATE_ASSET_TTL_SECONDS = 3600;

/** Longer TTL for explore-published public copies referenced in feeds. */
export const EXPLORE_PUBLIC_TTL_SECONDS = 60 * 60 * 24 * 365;

export type StoredAssetRef = {
  bucket: string;
  path: string;
};

const STORAGE_REF_PREFIX = "storage:";

export function toStorageRef(path: string, bucket = STORAGE_BUCKET): string {
  return `${STORAGE_REF_PREFIX}${bucket}/${path.replace(/^\/+/, "")}`;
}

export function parseStorageRef(value: string): StoredAssetRef | null {
  if (!value.startsWith(STORAGE_REF_PREFIX)) return null;
  const rest = value.slice(STORAGE_REF_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

export function isPublicAssetPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "");
  return INTENTIONALLY_PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function privateUserAssetPath(userId: string, filename: string): string {
  return `${userId}/${filename}`;
}

export function publicExploreAssetPath(slug: string, filename: string): string {
  return `${PUBLIC_ASSET_PREFIX}explore/${slug}/${filename}`;
}

export function extractPathFromSupabasePublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/generations/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "");
}

export function extractPathFromSupabaseSignedUrl(url: string): string | null {
  const marker = "/storage/v1/object/sign/generations/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const tail = url.slice(idx + marker.length).split("?")[0] ?? "";
  return decodeURIComponent(tail);
}

export function extractStoragePathFromClientUrl(url: string): string | null {
  return (
    parseStorageRef(url)?.path ??
    extractPathFromSupabasePublicUrl(url) ??
    extractPathFromSupabaseSignedUrl(url)
  );
}

export async function signStoragePath(
  path: string,
  expiresIn = PRIVATE_ASSET_TTL_SECONDS,
  bucket = STORAGE_BUCKET
): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function getPublicStorageUrl(path: string, bucket = PUBLIC_STORAGE_BUCKET): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = admin.storage.from(bucket).getPublicUrl(path.replace(/^\/+/, ""));
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}

/** Resolve a stored URL/ref for client display. */
export async function resolveAssetForClient(stored: string): Promise<string> {
  if (!stored || stored.startsWith("data:") || stored.startsWith("blob:")) return stored;

  const ref = parseStorageRef(stored);
  if (ref) {
    if (ref.bucket === PUBLIC_STORAGE_BUCKET) {
      return (await getPublicStorageUrl(ref.path, ref.bucket)) ?? stored;
    }
    const ttl = isPublicAssetPath(ref.path) ? EXPLORE_PUBLIC_TTL_SECONDS : PRIVATE_ASSET_TTL_SECONDS;
    return (await signStoragePath(ref.path, ttl, ref.bucket)) ?? stored;
  }

  const legacyPath = extractPathFromSupabasePublicUrl(stored) ?? extractPathFromSupabaseSignedUrl(stored);
  if (legacyPath) {
    const ttl = isPublicAssetPath(legacyPath) ? EXPLORE_PUBLIC_TTL_SECONDS : PRIVATE_ASSET_TTL_SECONDS;
    return (await signStoragePath(legacyPath, ttl)) ?? stored;
  }

  return stored;
}

export async function resolveAssetListForClient(stored: string[]): Promise<string[]> {
  return Promise.all(stored.map((s) => resolveAssetForClient(s)));
}

export async function copyToPublicExploreAsset(input: {
  sourcePath: string;
  slug: string;
  extension?: string;
}): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();
    const ext = input.extension ?? input.sourcePath.split(".").pop() ?? "png";
    const dest = publicExploreAssetPath(input.slug, `asset.${ext}`);
    const { data: source, error: downloadError } = await admin.storage.from(STORAGE_BUCKET).download(input.sourcePath);
    if (downloadError || !source) return null;
    const { error } = await admin.storage.from(PUBLIC_STORAGE_BUCKET).upload(dest, source, { upsert: true });
    if (error) return null;
    return (await getPublicStorageUrl(dest, PUBLIC_STORAGE_BUCKET)) ?? null;
  } catch {
    return null;
  }
}

export async function publishStoredUrlToExplore(input: {
  storedUrl: string;
  slug: string;
}): Promise<string | null> {
  const ref = parseStorageRef(input.storedUrl);
  const sourcePath =
    ref?.path ??
    extractStoragePathFromClientUrl(input.storedUrl) ??
    null;
  if (!sourcePath || isPublicAssetPath(sourcePath)) {
    if (sourcePath && isPublicAssetPath(sourcePath)) return resolveAssetForClient(input.storedUrl);
    return input.storedUrl.startsWith("http") ? input.storedUrl : null;
  }
  return copyToPublicExploreAsset({
    sourcePath,
    slug: input.slug,
    extension: sourcePath.split(".").pop(),
  });
}
