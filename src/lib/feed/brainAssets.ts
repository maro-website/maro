import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import type { PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import { MAX_COMPOSER_ATTACHMENTS } from "@/lib/config/attachments";

export type FeedBrainAsset = { id: string; name: string; keywords: string; storageRef: string; role: "product" | "logo" };
export type FeedBrainSelection = { asset: FeedBrainAsset; previewUrl: string };

function ownedReference(value: string | null | undefined, userId: string) {
  const prefix = `storage:generations/${userId}/`;
  return Boolean(userId && value?.startsWith(prefix) && !/[\\%?#\u0000-\u001f\u007f]/.test(value) && value.slice(prefix.length).split("/").every(part => part && part !== "." && part !== ".."));
}

/** Use only stable private identities from the active Brain. Signed URLs are display-only. */
export function feedBrainAssets(userId: string, workspaceId: string, profile: WorkspaceBrainProfile, sources: WorkspaceSource[]): FeedBrainAsset[] {
  const items: FeedBrainAsset[] = [], seen = new Set<string>();
  const logo = profile.brand.logoStorageRef || profile.brand.logoUrl;
  if (ownedReference(logo, userId)) {
    seen.add(logo!);
    items.push({ id: "brand-logo", name: `${profile.brand.name || "Brendi"} · Logo`, keywords: "logo", storageRef: logo!, role: "logo" });
  }
  for (const source of sources) {
    const ref = source.storageRef || source.fileUrl;
    if (source.workspaceId !== workspaceId || !ownedReference(ref, userId) || seen.has(ref) || (source.mimeType && !/^image\/(?:png|jpeg|webp)$/i.test(source.mimeType))) continue;
    seen.add(ref);
    items.push({ id: source.id, name: source.name, keywords: source.keywords, storageRef: ref, role: "product" });
  }
  return items;
}

/** Selecting an existing Brain image does not upload or copy its bytes. */
export function mergeFeedBrainAssets(existing: PrivateImageAttachment[], selected: FeedBrainSelection[]) {
  const seen = new Set(existing.map(item => item.storageRef).filter(Boolean));
  const additions: Array<{ attachment: PrivateImageAttachment; role: FeedBrainAsset["role"] }> = [];
  for (const { asset, previewUrl } of selected) {
    if (seen.has(asset.storageRef)) continue;
    if (!previewUrl) throw new Error("brain_preview_unavailable");
    seen.add(asset.storageRef);
    additions.push({ attachment: { id: `brain:${asset.storageRef}`, name: asset.name, storageRef: asset.storageRef, previewUrl, status: "ready" }, role: asset.role });
  }
  if (existing.length + additions.length > MAX_COMPOSER_ATTACHMENTS) throw new Error("too_many_references");
  return { attachments: [...existing, ...additions.map(item => item.attachment)], additions };
}
