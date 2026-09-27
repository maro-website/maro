import {
  resolvePrivateAssetRefsStrict,
  uploadImageReference,
} from "@/lib/services/projectAssetService";

export type PrivateImageAttachmentStatus =
  | "pending"
  | "uploading"
  | "ready"
  | "preview-error"
  | "decode-error"
  | "upload-error";

export type PrivateImageAttachment = {
  id: string;
  name: string;
  /** Canonical private identity sent to generation APIs. */
  storageRef?: string;
  /** Display-only local data URL or short-lived signed URL. */
  previewUrl: string;
  /** Original browser file used by the existing signed-upload flow. */
  sourceFile?: File;
  status: PrivateImageAttachmentStatus;
  error?: string;
};

/** Upload once when needed, then always resolve preview from the canonical ref. */
export async function uploadOrResolvePrivateAttachment(
  attachment: PrivateImageAttachment
): Promise<PrivateImageAttachment> {
  let storageRef = attachment.storageRef;
  let fallbackPreview = attachment.previewUrl;
  if (!storageRef) {
    if (!attachment.sourceFile) throw new Error("upload-failed");
    const uploaded = await uploadImageReference(attachment.sourceFile);
    storageRef = uploaded.storageRef;
    fallbackPreview = uploaded.url;
  }
  try {
    const resolved = await resolvePrivateAssetRefsStrict([storageRef]);
    return {
      ...attachment,
      storageRef,
      previewUrl: resolved[storageRef],
      sourceFile: undefined,
      status: "ready",
      error: undefined,
    };
  } catch {
    return {
      ...attachment,
      storageRef,
      previewUrl: fallbackPreview,
      sourceFile: undefined,
      status: "preview-error",
      error: "Pamja private nuk u hap. Provo përsëri.",
    };
  }
}
