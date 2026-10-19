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

import { uploadImageReference, uploadImageReferenceDataUrl } from "@/lib/services/projectAssetService";

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

  it.each([
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
  ])("uploads a saved %s logo reference when CSP blocks data URL fetches", async (type, extension) => {
    const bytes = new Uint8Array([0, 127, 128, 255]);
    const dataUrl = `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
    const path = `user-1/project-assets/reference.${extension}`;
    const storageRef = `storage:generations/${path}`;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // The production connect-src policy permits API requests, but not data:.
      if (input !== "/api/projects/assets") throw new TypeError("Failed to fetch");
      const body = JSON.parse(String(init?.body));
      return Response.json(body.action === "prepare"
        ? { path, uploadToken: "signed-upload-token", storageRef }
        : { storageRef, url: "https://supabase.example/signed-preview" });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadImageReferenceDataUrl(dataUrl, "logo-reference")).resolves.toEqual({
      storageRef,
      url: "https://supabase.example/signed-preview",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const uploaded = uploadToSignedUrl.mock.calls[0]?.[2] as File;
    expect(uploaded.name).toBe(`logo-reference.${extension}`);
    expect(uploaded.type).toBe(type);
    expect(new Uint8Array(await uploaded.arrayBuffer())).toEqual(bytes);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      action: "prepare", purpose: "image-reference", type, size: bytes.length,
    });
  });

  it.each([
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,%%%",
    "data:image/png;base64,A",
    "data:image/png;base64,",
  ])("rejects an invalid saved reference before upload: %s", async dataUrl => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadImageReferenceDataUrl(dataUrl)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });
});
