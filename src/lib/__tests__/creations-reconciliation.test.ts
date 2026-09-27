import { describe, expect, it } from "vitest";
import { creationIdentityKeys, mergeServerCreations } from "@/lib/creations/mergeCreations";
import type { ImageCreation } from "@/lib/types";

function creation(patch: Partial<ImageCreation>): ImageCreation {
  return {
    id: "local-1",
    toolId: "reklama",
    prompt: "Perfume",
    urls: [],
    createdAt: "2026-08-17T10:00:00.000Z",
    ...patch,
  };
}

describe("creation library reconciliation", () => {
  it("treats renewed signed URLs as the same stored image", () => {
    const oldUrl = "https://x.supabase.co/storage/v1/object/sign/generations/user-1/a.png?token=old";
    const freshUrl = "https://x.supabase.co/storage/v1/object/sign/generations/user-1/a.png?token=fresh";
    expect(creationIdentityKeys(creation({ urls: [oldUrl] }))).toContain(
      "asset:generations/user-1/a.png"
    );

    const merged = mergeServerCreations(
      [
        creation({ id: "duplicate-a", urls: [oldUrl] }),
        creation({ id: "duplicate-b", urls: [`${oldUrl}&copy=1`] }),
      ],
      [
        creation({
          id: "generation-1",
          serverId: "generation-1",
          storageRefs: ["storage:generations/user-1/a.png"],
          urls: [freshUrl],
        }),
      ],
      "workspace-1"
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("generation-1");
    expect(merged[0].urls).toEqual([freshUrl]);
  });

  it("removes stale remote ghosts but preserves unsynced local and audio results", () => {
    const now = Date.parse("2026-08-21T12:00:00.000Z");
    const merged = mergeServerCreations(
      [
        creation({ id: "ghost", urls: ["https://example.com/missing.png"] }),
        creation({ id: "new", urls: ["data:image/png;base64,abc"], createdAt: new Date(now).toISOString() }),
        creation({ id: "audio", mediaType: "audio", urls: ["https://example.com/audio.mp3"] }),
      ],
      [],
      "workspace-1",
      now
    );

    expect(merged.map((item) => item.id)).toEqual(["new", "audio"]);
  });
});
