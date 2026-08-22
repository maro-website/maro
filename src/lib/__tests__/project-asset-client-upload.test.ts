import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAccessToken, getSupabaseBrowser, uploadToSignedUrl } = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getSupabaseBrowser: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getAccessToken,
  getSupabaseBrowser,
}));

import { uploadImageReference } from "@/lib/services/projectAssetService";

describe("maroImazh signed client upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue("real-session-token");
    uploadToSignedUrl.mockResolvedValue({ data: { path: "uploaded" }, error: null });
    getSupabaseBrowser.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          expect(bucket).toBe("generations");
          return { uploadToSignedUrl };
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["PNG", "image/png", "logo.png"],
    ["JPEG", "image/jpeg", "logo.jpg"],
    ["WebP", "image/webp", "logo.webp"],
  ])("uses prepare → Supabase signed upload → finalize for %s", async (_label, type, name) => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], name, { type });
    const path = `user-1/project-assets/upload.${name.split(".").at(-1)}`;
    const storageRef = `storage:generations/${path}`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        path,
        uploadToken: "signed-upload-token",
        storageRef,
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        storageRef,
        url: "https://supabase.example/signed-preview",
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadImageReference(file)).resolves.toEqual({
      storageRef,
      url: "https://supabase.example/signed-preview",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/projects/assets");
    const prepareInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(prepareInit.method).toBe("POST");
    expect(prepareInit.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer real-session-token",
    });
    expect(JSON.parse(String(prepareInit.body))).toEqual({
      action: "prepare",
      purpose: "image-reference",
      name,
      type,
      size: file.size,
    });

    expect(uploadToSignedUrl).toHaveBeenCalledWith(path, "signed-upload-token", file, {
      contentType: type,
      cacheControl: "31536000",
    });

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/projects/assets");
    const finalizeInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(finalizeInit.body))).toEqual({
      action: "finalize",
      purpose: "image-reference",
      storageRef,
    });
  });
});
