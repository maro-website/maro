import "server-only";
import { nativeImageReference, type NativeImageAsset, type NativeImageFormat } from "@/lib/ai/image26";
import { isOwnedPrivateAssetPath, parseStorageRef, signStoragePath } from "./assets";

export async function resolveNativeImage(previewRef: string, format: NativeImageFormat, userId: string): Promise<NativeImageAsset | undefined> {
  const reference = nativeImageReference(previewRef, format);
  const path = reference && parseStorageRef(reference)?.path;
  if (!reference || !path || !isOwnedPrivateAssetPath(path, userId)) return undefined;
  return { format, reference, ...(format === "gif" ? { url: (await signStoragePath(path)) ?? undefined } : {}) };
}
