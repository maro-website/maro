import { describe, it, expect } from "vitest";
import { emptyBrainProfile, type WorkspaceSource } from "@/lib/workspaces/brainTypes";
import { feedBrainAssets, mergeFeedBrainAssets, type FeedBrainAsset } from "@/lib/feed/brainAssets";
const ref = (name: string, user = "alice") => `storage:generations/${user}/workspace-assets/ws/${name}`;
const source = (id: string, patch: Partial<WorkspaceSource> = {}): WorkspaceSource => ({ id, workspaceId: "ws", name: id, keywords: "produkt", fileUrl: ref(id), storageRef: ref(id), mimeType: "image/png", createdAt: "2026-10-31", ...patch });
const asset = (id: string): FeedBrainAsset => ({ id, name: id, storageRef: ref(id), keywords: "", role: "product" });
const selected = (id: string) => ({ asset: asset(id), previewUrl: `https://synthetic.test/${id}` });

describe("Feed Brain asset selection", () => {
  it("includes the active Brain's original logo and product images, deduplicates identities, and excludes other workspaces, owners and unsupported files", () => {
    const profile = emptyBrainProfile(); profile.brand.name = "Mr. Clean"; profile.brand.logoStorageRef = ref("logo");
    const result = feedBrainAssets("alice", "ws", profile, [source("spray"), source("floor"), source("logo"), source("duplicate", { storageRef: ref("spray") }), source("other-ws", { workspaceId: "other" }), source("foreign", { storageRef: ref("foreign", "bob") }), source("pdf", { mimeType: "application/pdf" }), source("remote", { storageRef: undefined, fileUrl: "https://external.test/image.png" }), source("traversal", { storageRef: ref("../secret") })]);
    expect(result.map(item => item.id)).toEqual(["brand-logo", "spray", "floor"]);
    expect(result[0]).toMatchObject({ role: "logo", name: "Mr. Clean · Logo", storageRef: ref("logo") });
    expect(result.slice(1).every(item => item.role === "product")).toBe(true);
  });
  it("keeps stable private references even when display URLs are signed, and never imports a remote or encoded logo identity", () => {
    const profile = emptyBrainProfile(); profile.brand.logoUrl = "https://external.test/logo.png";
    const items = feedBrainAssets("alice", "ws", profile, [source("product", { fileUrl: "https://synthetic.test/signed?token=display-only" }), source("legacy", { storageRef: undefined, fileUrl: ref("legacy"), mimeType: null }), source("encoded", { storageRef: ref("%2e%2e/a") })]);
    expect(items.map(item => item.storageRef)).toEqual([ref("product"), ref("legacy")]);
  });
  it("combines Brain references with new uploads without reuploading, duplicating objects or losing the logo role", () => {
    const existing = [{ id: "upload", name: "Fresh upload", storageRef: ref("fresh"), previewUrl: "https://synthetic.test/fresh", status: "ready" as const }];
    const logo = { ...selected("logo"), asset: { ...asset("logo"), role: "logo" as const } };
    const merged = mergeFeedBrainAssets(existing, [selected("fresh"), selected("spray"), selected("spray"), logo]);
    expect(merged.attachments.map(item => item.storageRef)).toEqual([ref("fresh"), ref("spray"), ref("logo")]);
    expect(merged.attachments[0]).toBe(existing[0]);
    expect(merged.additions.map(item => item.role)).toEqual(["product", "logo"]);
    expect(merged.additions.every(item => item.attachment.status === "ready" && !item.attachment.sourceFile)).toBe(true);
  });
  it("enforces ten total references and requires a resolved preview before accepting a Brain selection", () => {
    const existing = Array.from({ length: 9 }, (_, i) => ({ id: String(i), name: String(i), storageRef: ref(String(i)), previewUrl: "https://synthetic.test/image", status: "ready" as const }));
    expect(mergeFeedBrainAssets(existing, [selected("0"), selected("new")]).attachments).toHaveLength(10);
    expect(() => mergeFeedBrainAssets(existing, [selected("a"), selected("b")])).toThrow("too_many_references");
    expect(() => mergeFeedBrainAssets([], [{ asset: asset("broken"), previewUrl: "" }])).toThrow("brain_preview_unavailable");
  });
});
