import type { ImageCreation } from "@/lib/types";

export function creationAssetRef(creation: ImageCreation, index: number): string {
  return creation.storageRefs?.[index] ?? creation.urls[index];
}

/** Keep URL/reference indices aligned after deleting selected outputs. */
export function withoutCreationAssets(creation: ImageCreation, removed: ReadonlySet<string>): ImageCreation {
  const indices = creation.urls.map((_, index) => index).filter(index => !removed.has(creationAssetRef(creation, index)));
  return { ...creation, urls: indices.map(index => creation.urls[index]),
    storageRefs: creation.storageRefs ? indices.map(index => creationAssetRef(creation, index)) : undefined };
}
