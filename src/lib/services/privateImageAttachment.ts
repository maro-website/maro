import {
  MAX_IMAGE_REFERENCE_FILE_BYTES,
  resolvePrivateAssetRefsStrict,
  uploadImageReference,
} from "@/lib/services/projectAssetService";

export const IMAGE_REFERENCE_ACCEPT = "image/png,image/jpeg,image/webp";
export const IMAGE_REFERENCE_FORMAT_ERROR = "Ky format nuk mbështetet. Përdor vetëm PNG, JPG ose WebP.";

export type PrivateImageAttachmentStatus =
  | "pending"
  | "uploading"
  | "ready"
  | "preview-error"
  | "decode-error"
  | "invalid-file"
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

/** Keep rejected selections visible and blocking, without reading or uploading their bytes. */
export function createPrivateImageAttachment(file: File, id: string, signedIn: boolean): PrivateImageAttachment {
  const error = !/^image\/(?:png|jpe?g|webp)$/i.test(file.type)
    ? IMAGE_REFERENCE_FORMAT_ERROR
    : file.size > MAX_IMAGE_REFERENCE_FILE_BYTES
      ? "Imazhi është shumë i madh. Përdor PNG, JPG ose WebP deri në 25 MB."
      : undefined;
  return {
    id, name: file.name, previewUrl: "",
    ...(error ? { status: "invalid-file", error } : { sourceFile: file, status: signedIn ? "uploading" : "pending" }),
  };
}

/** Upload once when needed, then always resolve preview from the canonical ref. */
export async function uploadOrResolvePrivateAttachment(
  attachment: PrivateImageAttachment
): Promise<PrivateImageAttachment> {
  if (attachment.status === "invalid-file") throw new Error("invalid-file-type");
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
