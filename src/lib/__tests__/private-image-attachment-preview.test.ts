import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadImageReference, resolvePrivateAssetRefsStrict } = vi.hoisted(() => ({
  uploadImageReference: vi.fn(),
  resolvePrivateAssetRefsStrict: vi.fn(),
}));

vi.mock("@/lib/services/projectAssetService", () => ({
  uploadImageReference,
  resolvePrivateAssetRefsStrict,
  MAX_IMAGE_REFERENCE_FILE_BYTES: 25 * 1024 * 1024,
}));

import {
  createPrivateImageAttachment,
  IMAGE_REFERENCE_FORMAT_ERROR,
  uploadOrResolvePrivateAttachment,
  type PrivateImageAttachment,
} from "@/lib/services/privateImageAttachment";

const localAttachment = (type = "image/png", name = "logo.png"): PrivateImageAttachment => {
  const sourceFile = new File([new Uint8Array([1, 2, 3])], name, { type });
  return {
    id: `att-${name}`,
    name,
    previewUrl: `data:${type};base64,LOCAL_ONLY`,
    sourceFile,
    status: "uploading",
  };
};

describe("maroImazh private attachment preview state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["image/avif", "image/gif", "image/svg+xml", "application/pdf", ""])("keeps a rejected %s selection visible without uploading it", async type => {
    const sourceFile = new File([new Uint8Array([1, 2, 3])], "product.avif", { type });
    const rejected = createPrivateImageAttachment(sourceFile, "rejected", true);
    expect(rejected).toEqual({ id: "rejected", name: "product.avif", previewUrl: "", status: "invalid-file", error: IMAGE_REFERENCE_FORMAT_ERROR });
    await expect(uploadOrResolvePrivateAttachment(rejected)).rejects.toThrow("invalid-file-type");
    expect(uploadImageReference).not.toHaveBeenCalled();
    expect(resolvePrivateAssetRefsStrict).not.toHaveBeenCalled();
  });

  it("keeps an oversized image blocking without retaining its bytes", () => {
    const rejected = createPrivateImageAttachment(new File([new Uint8Array(25 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), "large", false);
    expect(rejected.status).toBe("invalid-file");
    expect(rejected.error).toContain("25 MB");
    expect(rejected.sourceFile).toBeUndefined();
  });

  it.each(["image/png", "image/jpeg", "image/webp"])("retains a supported %s file for the existing upload flow", type => {
    const sourceFile = new File([new Uint8Array([1, 2, 3])], "product", { type });
    expect(createPrivateImageAttachment(sourceFile, "valid", true)).toMatchObject({ sourceFile, status: "uploading" });
    expect(createPrivateImageAttachment(sourceFile, "valid", false)).toMatchObject({ sourceFile, status: "pending" });
  });

  it.each([
    ["PNG", "image/png", "logo.png"],
    ["JPEG", "image/jpeg", "logo.jpg"],
    ["WebP", "image/webp", "logo.webp"],
  ])("uploads a selected %s File, then keeps canonical storage and preview separate", async (_label, type, name) => {
    const storageRef = "storage:generations/user-1/project-assets/logo.png";
    uploadImageReference.mockResolvedValue({ storageRef, url: "https://signed/upload-result" });
    resolvePrivateAssetRefsStrict.mockResolvedValue({ [storageRef]: "https://signed/resolved-preview" });
    const attachment = localAttachment(type, name);

    const result = await uploadOrResolvePrivateAttachment(attachment);

    expect(uploadImageReference).toHaveBeenCalledWith(attachment.sourceFile);
    expect(result.storageRef).toBe(storageRef);
    expect(result.previewUrl).toBe("https://signed/resolved-preview");
    expect(result.sourceFile).toBeUndefined();
    expect(result.status).toBe("ready");
  });

  it("re-resolves preview without uploading a duplicate", async () => {
    const storageRef = "storage:generations/user-1/project-assets/logo.png";
    uploadImageReference.mockResolvedValue({ storageRef, url: "https://signed/first" });
    resolvePrivateAssetRefsStrict.mockRejectedValueOnce(new Error("preview-resolve-failed"));
    const failedPreview = await uploadOrResolvePrivateAttachment(localAttachment());
    expect(failedPreview.status).toBe("preview-error");
    expect(failedPreview.storageRef).toBe(storageRef);

    resolvePrivateAssetRefsStrict.mockResolvedValueOnce({ [storageRef]: "https://signed/retry" });
    const retried = await uploadOrResolvePrivateAttachment(failedPreview);
    expect(retried.status).toBe("ready");
    expect(retried.previewUrl).toBe("https://signed/retry");
    expect(uploadImageReference).toHaveBeenCalledTimes(1);
  });

  it("resolves a maroLogo generation reference without re-uploading", async () => {
    const storageRef = "storage:generations/user-1/real-marologo.png";
    resolvePrivateAssetRefsStrict.mockResolvedValue({ [storageRef]: "https://signed/marologo" });

    const result = await uploadOrResolvePrivateAttachment({
      id: "att-logo",
      name: "maroLogo",
      storageRef,
      previewUrl: "https://signed/old-marologo",
      status: "uploading",
    });

    expect(result.previewUrl).toBe("https://signed/marologo");
    expect(result.storageRef).toBe(storageRef);
    expect(uploadImageReference).not.toHaveBeenCalled();
  });
});
