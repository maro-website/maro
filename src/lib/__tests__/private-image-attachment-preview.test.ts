import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadImageReferenceDataUrl, resolvePrivateAssetRefsStrict } = vi.hoisted(() => ({
  uploadImageReferenceDataUrl: vi.fn(),
  resolvePrivateAssetRefsStrict: vi.fn(),
}));

vi.mock("@/lib/services/projectAssetService", () => ({
  uploadImageReferenceDataUrl,
  resolvePrivateAssetRefsStrict,
}));

import {
  uploadOrResolvePrivateAttachment,
  type PrivateImageAttachment,
} from "@/lib/services/privateImageAttachment";

const localAttachment = (): PrivateImageAttachment => ({
  id: "att-local",
  name: "logo.png",
  previewUrl: "data:image/png;base64,LOCAL_ONLY",
  sourceDataUrl: "data:image/png;base64,LOCAL_ONLY",
  status: "uploading",
});

describe("maroImazh private attachment preview state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps canonical storage and signed display URL separate after manual upload", async () => {
    const storageRef = "storage:generations/user-1/project-assets/logo.png";
    uploadImageReferenceDataUrl.mockResolvedValue({ storageRef, url: "https://signed/upload-result" });
    resolvePrivateAssetRefsStrict.mockResolvedValue({ [storageRef]: "https://signed/resolved-preview" });

    const result = await uploadOrResolvePrivateAttachment(localAttachment());

    expect(result.storageRef).toBe(storageRef);
    expect(result.previewUrl).toBe("https://signed/resolved-preview");
    expect(result.sourceDataUrl).toBeUndefined();
    expect(result.status).toBe("ready");
  });

  it("re-resolves preview without uploading a duplicate", async () => {
    const storageRef = "storage:generations/user-1/project-assets/logo.png";
    uploadImageReferenceDataUrl.mockResolvedValue({ storageRef, url: "https://signed/first" });
    resolvePrivateAssetRefsStrict.mockRejectedValueOnce(new Error("preview-resolve-failed"));
    const failedPreview = await uploadOrResolvePrivateAttachment(localAttachment());
    expect(failedPreview.status).toBe("preview-error");
    expect(failedPreview.storageRef).toBe(storageRef);

    resolvePrivateAssetRefsStrict.mockResolvedValueOnce({ [storageRef]: "https://signed/retry" });
    const retried = await uploadOrResolvePrivateAttachment(failedPreview);
    expect(retried.status).toBe("ready");
    expect(retried.previewUrl).toBe("https://signed/retry");
    expect(uploadImageReferenceDataUrl).toHaveBeenCalledTimes(1);
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
    expect(uploadImageReferenceDataUrl).not.toHaveBeenCalled();
  });
});
