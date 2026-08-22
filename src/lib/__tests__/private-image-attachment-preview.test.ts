import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadImageReference, resolvePrivateAssetRefsStrict } = vi.hoisted(() => ({
  uploadImageReference: vi.fn(),
  resolvePrivateAssetRefsStrict: vi.fn(),
}));

vi.mock("@/lib/services/projectAssetService", () => ({
  uploadImageReference,
  resolvePrivateAssetRefsStrict,
}));

import {
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
