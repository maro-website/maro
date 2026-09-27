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

/** Reject path encodings/segments that could change the object after authorization. */
function isCanonicalAssetPath(path: string): boolean {
  return Boolean(path) &&
    !/[\\%?#\u0000-\u001f\u007f]/.test(path) &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

/** Private uploads and generated assets are stored under the authenticated user's ID. */
export function isOwnedPrivateAssetPath(path: string, userId: string): boolean {
  return Boolean(userId) && isCanonicalAssetPath(path) &&
    path.split("/").length > 1 && path.split("/")[0] === userId;
}

/** Accept stable refs or legacy URLs from this project's object store only. */
export function parseMaroStorageAsset(value: string): StoredAssetRef | null {
  let ref = parseStorageRef(value);
  if (!ref) {
    try {
      const configured = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
      const url = new URL(value);
      if (configured.protocol !== "https:" || url.origin !== configured.origin ||
          url.username || url.password || url.hash) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/(generations|maro-public)\/(.+)$/);
      if (!match) return null;
      ref = { bucket: match[1], path: decodeURIComponent(match[2]) };
    } catch {
      return null;
    }
  }
  if (![STORAGE_BUCKET, PUBLIC_STORAGE_BUCKET].includes(ref.bucket) ||
      !isCanonicalAssetPath(ref.path)) return null;
  return ref;
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
  userId: string;
  slug: string;
  extension?: string;
}): Promise<string | null> {
  // This must run before creating a service-role client or reading any private bytes.
  if (!isOwnedPrivateAssetPath(input.sourcePath, input.userId)) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(input.slug)) return null;
  try {
    const admin = getSupabaseAdmin();
    const ext = input.extension ?? input.sourcePath.split(".").pop() ?? "png";
    if (!/^[a-zA-Z0-9]+$/.test(ext)) return null;
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
  userId: string;
}): Promise<string | null> {
  const ref = parseMaroStorageAsset(input.storedUrl);
  if (!ref || !input.userId) return null;
  // Existing intentionally public assets can be shared without copying private data.
  if (isPublicAssetPath(ref.path)) {
    return resolveAssetForClient(toStorageRef(ref.path, ref.bucket));
  }
  if (ref.bucket !== STORAGE_BUCKET) return null;
  return copyToPublicExploreAsset({
    sourcePath: ref.path,
    userId: input.userId,
    slug: input.slug,
    extension: ref.path.split(".").pop(),
  });
}
