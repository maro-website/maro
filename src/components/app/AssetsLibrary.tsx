"use client";

import { PreviewThumb } from "@/components/website-previews/PreviewThumb";
import { StableImage } from "@/components/app/StableImage";
import { PreviewFallback } from "@/components/app/PreviewFallback";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { StorageUsage } from "@/components/workspaces/StorageUsage";
import { MyPublications } from "@/components/explore/MyPublications";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { fetchUploadedAssets, fetchAssetMetadata, deleteUploadedAsset, assetFilename, formatAssetBytes, ownedLibraryReference, libraryStorageRef, type UploadedLibraryAsset, type LibrarySelection } from "@/lib/services/assetLibrary";
import { creationAssetRef } from "@/lib/creations/creationAssets";
import { useLibraryWorkspaces } from "./useLibraryWorkspaces";
import { STORAGE_CHANGED_EVENT } from "@/lib/workspaces/accountPolicy";
import { ItemMenu, CreationLightbox, creationConversationHref } from "@/components/app/cards";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { useToast } from "@/components/ui/Toast";
import { normalizeWorkspaceBrand } from "@/lib/workspaces/brand";
import { getTool } from "@/lib/tools/registry";
import { ToolIcon as ProductIcon } from "@/components/app/OptionIcon";
import { getProductBrand } from "@/lib/design/maro-system";
import { cn } from "@/lib/utils/cn";
import type { ImageCreation, Project } from "@/lib/types";
import {
  Upload,
  Check,
  Search,
  Sparkles,
  LayoutGrid,
  Heart,
  Globe,
  AudioLines,
  FileText,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
} from "lucide-react";

type Row =
  | { kind: "upload"; id: string; title: string; toolId: string; toolName: string; time: string; fort: false; favourite: false; asset: UploadedLibraryAsset }
  | {
      kind: "project";
      id: string;
      title: string;
      toolId: string;
      toolName: string;
      time: string;
      fort: boolean;
      favourite: boolean;
      project: Project;
    }
  | {
      kind: "creation";
      id: string;
      title: string;
      toolId: string;
      toolName: string;
      time: string;
      fort: boolean;
      favourite: boolean;
      media: "image" | "audio" | "text";
      creation: ImageCreation;
      imageIndex?: number;
    };

const rowKey = (row: Row) => `${row.kind}:${row.id}`;
function rowReference(row: Row): string | undefined {
  return row.kind === "upload" ? row.asset.storageRef : row.kind === "creation"
    ? creationAssetRef(row.creation, row.imageIndex ?? 0) : row.project.thumbnailStorageRef ?? row.project.thumbnailUrl;
}
function rowFilename(row: Row): string {
  if (row.kind === "upload") return row.asset.name;
  const fallback = row.kind === "creation" ? `${getProductBrand(row.toolId)?.displayName ?? "maro"}-${row.creation.id}-${(row.imageIndex ?? 0) + 1}` : row.title;
  return assetFilename(rowReference(row), fallback);
}

// Thumbnail-size presets driven by the top-right slider (like Higgsfield).
const SIZE_PRESETS = [148, 190, 240, 300];

function ToolIcon({ toolId, media, className }: { toolId: string; media?: "image" | "audio" | "text"; className?: string }) {
  const cls = className ?? "h-4 w-4";
  const brand = getProductBrand(toolId);
  if (brand && brand.id !== "maroFort") return <ProductIcon toolId={brand.id} className={cls} />;
  if (toolId === "website") return <Globe className={cls} />;
  if (media === "audio") return <AudioLines className={cls} />;
  if (media === "text") return <FileText className={cls} />;
  const tool = getTool(toolId);
  const Icon = tool?.icon ?? ImageIcon;
  return <Icon className={cls} />;
}

// Group label: "Sot", "Dje" or a localized date.
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return "Sot";
  if (diff === 1) return "Dje";
  return d.toLocaleDateString("sq-AL", { day: "numeric", month: "long", year: "numeric" });
}

export function AssetsLibrary({ picker, initialCategory = "made" }: { picker?: { limit: number; excludeRefs: string[]; onSelect: (assets: LibrarySelection[]) => void }; initialCategory?: "made" | "uploaded" | "saved" | "published" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useMaro();
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [category, setCategory] = React.useState(initialCategory);
  React.useEffect(() => { if (!picker) setCategory(initialCategory); }, [initialCategory, picker]);
  const [uploads, setUploads] = React.useState<UploadedLibraryAsset[]>([]);
  const [uploadOwner, setUploadOwner] = React.useState<string | undefined>();
  const [uploadError, setUploadError] = React.useState(false);
  const [uploadsLoading, setUploadsLoading] = React.useState(false);
  const [nextOffset, setNextOffset] = React.useState<number | null>(null);
  const [selected, setSelected] = React.useState<LibrarySelection[]>([]);
  const [selecting, setSelecting] = React.useState(false);
  const actionRef = React.useRef<HTMLDivElement>(null);
  const [actionsVisible, setActionsVisible] = React.useState(true);
  React.useEffect(() => {
    const element = actionRef.current;
    if (!element || picker || category === "published") return;
    const observer = new IntersectionObserver(([entry]) => setActionsVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [picker, category]);
  const [chosen, setChosen] = React.useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = React.useState<Row[]>([]);
  const [deleting, setDeleting] = React.useState(false);
  const [metadata, setMetadata] = React.useState<Record<string, number | null>>({});
  const [refresh, setRefresh] = React.useState(0);
  const { projects, creations, loading: libraryLoading, error: libraryError, patchCreation, removeCreation, changeProject } = useLibraryWorkspaces(refresh);
  const [workspaceFilter, setWorkspaceFilter] = React.useState<string | null>(null);
  const workspaceScope = workspaceFilter ?? activeWorkspace?.id ?? "all";
  const userId = user?.id;
  const ownedUploads = uploadOwner === userId ? uploads : [];
  React.useEffect(() => { setWorkspaceFilter(null); }, [userId]);
  React.useEffect(() => {
    const changed = () => setRefresh(value => value + 1);
    window.addEventListener(STORAGE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(STORAGE_CHANGED_EVENT, changed);
  }, []);
  React.useEffect(() => {
    setUploads([]); setSelected([]); setNextOffset(null); setUploadError(false);
    if (!userId) return;
    const controller = new AbortController();
    setUploadsLoading(true);
    void fetchUploadedAssets(0, controller.signal).then(result => {
      setUploadOwner(userId); setUploads(result.assets); setNextOffset(result.nextOffset);
    }).catch(() => { if (!controller.signal.aborted) setUploadError(true); })
      .finally(() => { if (!controller.signal.aborted) setUploadsLoading(false); });
    return () => controller.abort();
  }, [userId, refresh]);
  const loadMore = async () => {
    if (nextOffset === null || uploadsLoading) return;
    setUploadsLoading(true);
    try { const result = await fetchUploadedAssets(nextOffset);
      setUploads(current => [...current, ...result.assets.filter(asset => !current.some(item => item.storageRef === asset.storageRef))]);
      setNextOffset(result.nextOffset); setUploadError(false);
    } catch { setUploadError(true); } finally { setUploadsLoading(false); }
  };

  const [filter, setFilter] = React.useState<string>(searchParams.get("tool") ?? "all");
  const [query, setQuery] = React.useState("");
  const [sizeIdx, setSizeIdx] = React.useState(1);
  const [lightbox, setLightbox] = React.useState<ImageCreation | null>(null);

  const rows: Row[] = React.useMemo(() => {
    const projRows: Row[] = (picker ? [] : projects).map((p) => ({
      kind: "project",
      id: p.id,
      title: p.name || p.businessName || "Website",
      toolId: "website",
      toolName: "maro Web",
      time: p.updatedAt,
      fort: Boolean(p.fort?.enabled),
      favourite: Boolean(p.favourite),
      project: p,
    }));
    const creaRows: Row[] = creations.flatMap((c) => {
      if (picker && (c.mediaType ?? "image") !== "image") return [];
      const tool = getTool(c.toolId);
      const indices = (c.mediaType ?? "image") === "image" ? c.urls.map((_, index) => index) : [0];
      return indices.map((imageIndex): Row => ({
        kind: "creation",
        id: `${c.id}:${imageIndex}`,
        title: c.title || c.prompt || tool?.name || "Krijim",
        toolId: c.toolId,
        toolName: tool?.name ?? "Krijim",
        time: c.createdAt,
        fort: false,
        favourite: Boolean(c.favourite),
        media: c.mediaType ?? "image",
        creation: c, imageIndex,
      }));
    });
    return [...projRows, ...creaRows].sort((a, b) => +new Date(b.time) - +new Date(a.time));
  }, [projects, creations, picker]);

  const metadataKey = [...new Set(rows.map(row => libraryStorageRef(rowReference(row), userId)).filter((ref): ref is string => Boolean(ref)))].sort().join("\n");
  React.useEffect(() => {
    setMetadata({});
    if (!userId || !metadataKey) return;
    const controller = new AbortController();
    void fetchAssetMetadata(metadataKey.split("\n"), controller.signal).then(assets => {
      if (!controller.signal.aborted) setMetadata(Object.fromEntries(assets.map(asset => [asset.storageRef, asset.bytes])));
    }).catch(() => undefined);
    return () => controller.abort();
  }, [metadataKey, userId]);
  React.useEffect(() => {
    setChosen(new Set()); setSelecting(false); setPendingDelete([]);
  }, [category, filter, query, userId, workspaceScope]);

  const uploadWorkspaces = React.useMemo(() => {
    const usage = new Map<string, Set<string>>();
    const add = (ref: string | undefined, workspaceId: string | undefined) => {
      const canonical = libraryStorageRef(ref, userId);
      if (!canonical || !workspaceId) return;
      const ids = usage.get(canonical) ?? new Set<string>();
      ids.add(workspaceId); usage.set(canonical, ids);
    };
    for (const creation of creations) for (const ref of creation.inputRefs ?? []) add(ref, creation.workspaceId);
    for (const project of projects) {
      for (const asset of project.assets) add(asset.storageRef ?? asset.url, project.workspaceId);
      for (const ref of project.referenceImages ?? []) add(ref, project.workspaceId);
    }
    return usage;
  }, [creations, projects, userId]);
  const rowWorkspaceIds = (row: Row): string[] => {
    if (row.kind === "upload") return [...(uploadWorkspaces.get(row.asset.storageRef) ?? [])];
    const id = row.kind === "creation" ? row.creation.workspaceId : row.project.workspaceId;
    return id ? [id] : [];
  };
  const workspaceLabel = (row: Row) => {
    const ids = rowWorkspaceIds(row);
    return ids.length ? ids.map(id => workspaces.find(workspace => workspace.id === id)?.name ?? "Workspace i mëparshëm").join(" · ") : row.kind === "upload" ? "Ende pa workspace" : "Pa workspace";
  };
  const workspaceSelect = (className: string) => user && workspaces.length > 0 && <div className={className}><span className="mb-2 block text-[11px] font-semibold text-ink-3">Workspace</span><AssetFilter label="Workspace i aseteve" value={workspaceScope} onChange={setWorkspaceFilter} options={[{ value: "all", label: "Të gjitha workspace-et" }, ...workspaces.map(workspace => ({ value: workspace.id, label: workspace.name }))]} /></div>;
  const scopedRows = React.useMemo(() => rows.filter(row => {
    const id = row.kind === "creation" ? row.creation.workspaceId : row.kind === "project" ? row.project.workspaceId : undefined;
    return workspaceScope === "all" || id === workspaceScope;
  }), [rows, workspaceScope]);

  // Tool buckets that actually have items (for the left rail "Tools" group).
  const toolBuckets = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; media?: "image" | "audio" | "text" }>();
    for (const r of scopedRows) {
      const key = r.toolId;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else
        map.set(key, {
          id: key,
          name: r.toolName,
          count: 1,
          media: r.kind === "creation" ? r.media : undefined,
        });
    }
    return Array.from(map.values());
  }, [scopedRows]);

  const uploadRows: Row[] = ownedUploads.map(asset => ({ kind: "upload", id: asset.storageRef, title: asset.name, toolId: "upload", toolName: "Ngarkim", time: asset.createdAt, fort: false, favourite: false, asset }));
  const scopedUploads = uploadRows.filter(row => workspaceScope === "all" || rowWorkspaceIds(row).includes(workspaceScope));
  const categoryRows = category === "uploaded" ? scopedUploads : category === "saved" ? scopedRows.filter(row => row.favourite) : scopedRows;
  const chooseCategory = (value: typeof category) => { setCategory(value); setFilter("all"); if (!picker) router.push(`/krijimet?category=${value}`, { scroll: false }); };
  const selectionFor = (row: Row): LibrarySelection | null => {
    const storageRef = row.kind === "upload" ? row.asset.storageRef : row.kind === "creation"
      ? libraryStorageRef(row.creation.storageRefs?.[row.imageIndex ?? 0] ?? row.creation.urls[row.imageIndex ?? 0], userId) : null;
    if (!ownedLibraryReference(storageRef ?? undefined, userId) || !storageRef) return null;
    return { storageRef, name: row.title, url: row.kind === "upload" ? row.asset.url : row.kind === "creation" ? row.creation.urls[row.imageIndex ?? 0] : "" };
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return categoryRows.filter((r) => {
      if (filter === "fav" && !r.favourite) return false;
      if (filter !== "all" && filter !== "fav" && r.toolId !== filter) return false;
      if (q && !`${r.title} ${rowFilename(r)}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [categoryRows, filter, query]);

  // Group filtered rows by day, preserving desc order.
  const groups = React.useMemo(() => {
    const out: { key: string; label: string; items: Row[] }[] = [];
    let last: { key: string; label: string; items: Row[] } | null = null;
    for (const r of filtered) {
      const k = dayKey(r.time);
      if (!last || last.key !== k) {
        last = { key: k, label: dayLabel(r.time), items: [] };
        out.push(last);
      }
      last.items.push(r);
    }
    return out;
  }, [filtered]);

  const openRow = async (r: Row) => {
    if (picker) {
      const asset = selectionFor(r);
      if (!asset) return;
      setSelected(current => current.some(item => item.storageRef === asset.storageRef) ? current.filter(item => item.storageRef !== asset.storageRef) : current.length < picker.limit ? [...current, asset] : current);
      return;
    }
    if (selecting) {
      setChosen(current => { const next = new Set(current); if (next.has(rowKey(r))) next.delete(rowKey(r)); else next.add(rowKey(r)); return next; });
      return;
    }
    if (r.kind === "upload") { window.open(r.asset.url, "_blank", "noopener,noreferrer"); return; }
    const workspaceId = r.kind === "creation" ? r.creation.workspaceId : r.project.workspaceId;
    if (r.kind === "creation" && user && (!workspaceId || !workspaces.some(workspace => workspace.id === workspaceId))) {
      setLightbox(r.creation);
      return;
    }
    if (workspaceId && workspaceId !== activeWorkspace?.id) {
      try { await setActiveWorkspace(workspaceId); }
      catch { toast("Workspace nuk u hap. Provo përsëri.", "error"); return; }
    }
    if (r.kind === "project") {
      const href = r.project.status === "generating" ? `/projects/${r.id}/generating` : `/projects/${r.id}/editor`;
      router.push(href);
    } else {
      const href = creationConversationHref(r.creation);
      if (href && (!user || workspaceId)) router.push(href);
      else setLightbox(r.creation);
    }
  };

  const confirmDelete = async () => {
    if (deleting || !pendingDelete.length) return;
    setDeleting(true);
    const failed: Row[] = [];
    const creationGroups = new Map<string, Row[]>();
    for (const row of pendingDelete) {
      if (row.kind === "creation") {
        const group = creationGroups.get(row.creation.id) ?? [];
        group.push(row); creationGroups.set(row.creation.id, group);
      } else {
        try {
          if (row.kind === "upload") {
            await deleteUploadedAsset(row.asset.storageRef);
            setUploads(current => current.filter(asset => asset.storageRef !== row.asset.storageRef));
          } else changeProject(row.project, null);
        } catch { failed.push(row); }
      }
    }
    for (const group of creationGroups.values()) {
      try {
        const refs = group.map(rowReference).filter((ref): ref is string => Boolean(ref));
        const row = group[0];
        if (row.kind === "creation") await removeCreation(row.creation, refs);
      }
      catch { failed.push(...group); }
    }
    const deleted = pendingDelete.length - failed.length;
    setChosen(new Set(failed.map(rowKey))); setPendingDelete([]); setDeleting(false);
    if (deleted) toast(deleted === 1 ? "Aseti u fshi." : `${deleted} asete u fshinë.`);
    if (failed.length) toast("Disa asete nuk u fshinë. Provo përsëri.", "error");
  };

  const minW = SIZE_PRESETS[sizeIdx];

  return (
    <div className={cn("flex min-w-0 flex-1 overflow-x-clip", picker ? "h-[min(65dvh,620px)] flex-col" : "h-full max-lg:h-auto")}><div className="flex min-h-0 flex-1">
      {/* Left rail — asset library sections */}
      <aside className="hidden w-56 shrink-0 flex-col bg-surface/40 px-3 py-5 md:flex">
        <div className="px-2 pb-3 text-[13px] font-bold uppercase tracking-wider text-ink-3">
          Asetet
        </div>
        {category !== "published" && workspaceSelect("mb-5 block px-2")}
        <RailItem active={category === "made"} icon={<LayoutGrid className="h-4 w-4" />} label="Çka ke maru" count={scopedRows.length} onClick={() => chooseCategory("made")} />
        <RailItem active={category === "uploaded"} icon={<Upload className="h-4 w-4" />} label="Çka ke ngarku" count={scopedUploads.length} onClick={() => chooseCategory("uploaded")} />
        <RailItem active={category === "saved"} icon={<Heart className="h-4 w-4" />} label="Çka ke ruajt" count={picker ? scopedRows.filter(row => row.favourite).length : undefined} onClick={() => chooseCategory("saved")} />
        {!picker && <RailItem active={category === "published"} icon={<Globe className="h-4 w-4" />} label="Publikimet në Explore" onClick={() => chooseCategory("published")} />}

        {category !== "uploaded" && category !== "published" && toolBuckets.length > 0 && (
          <>
            <div className="mt-5 px-2 pb-2 text-[12px] font-bold uppercase tracking-wider text-ink-3">
              Mjetet
            </div>
            {toolBuckets.map((t) => (
              <RailItem
                key={t.id}
                active={filter === t.id}
                icon={<ToolIcon toolId={t.id} media={t.media} />}
                label={t.name}
                count={t.count}
                onClick={() => { chooseCategory("made"); setFilter(t.id); }}
              />
            ))}
          </>
        )}
        {!picker && <StorageUsage className="mt-auto" />}
      </aside>

      {/* Main area */}
      <div className="relative min-w-0 flex-1 overflow-y-auto scroll-thin">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[220px] bg-aurora" />

        {/* Sticky toolbar */}
        <div className="relative z-10 bg-canvas px-[20px] py-[10px] md:sticky md:top-0 lg:px-[30px]">
          {category !== "published" && workspaceSelect("mb-3 block md:hidden")}
          <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
            {category !== "published" && <div className="maro-library-search flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface px-3 py-2 max-md:basis-full">
              <Search className="h-4 w-4 shrink-0 text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kërko…"
                className="maro-search-input w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>}
            <AssetFilter className="min-w-0 flex-1 md:hidden" label="Kategoria e aseteve" value={category} onChange={value => { if (value === "made" || value === "uploaded" || value === "saved" || value === "published") chooseCategory(value); }} options={[{ value: "made", label: "Çka ke maru" }, { value: "uploaded", label: "Çka ke ngarku" }, { value: "saved", label: "Çka ke ruajt" }, ...(!picker ? [{ value: "published", label: "Publikimet në Explore" }] : [])]} />
            {/* Mobile filter dropdown */}
            {category !== "published" && <AssetFilter align="right" className="min-w-0 flex-1 md:hidden" label="Filtro mjetet" value={filter} onChange={setFilter} options={[{ value: "all", label: "Të gjitha" }, ...toolBuckets.map(tool => ({ value: tool.id, label: tool.name }))]} />}
            {/* Size slider */}
            {!picker && category !== "published" && <div ref={actionRef} className="flex items-center gap-2">
              {selecting && <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} disabled={!chosen.size || deleting} onClick={() => setPendingDelete(filtered.filter(row => chosen.has(rowKey(row))))}>Fshi ({chosen.size})</Button>}
              <Button variant="secondary" size="sm" disabled={deleting} icon={selecting ? undefined : <Check className="h-4 w-4" />} onClick={() => { setSelecting(value => !value); setChosen(new Set()); }}>{selecting ? "Anulo" : "Zgjedh"}</Button>
            </div>}
            {category !== "published" && <div className="hidden items-center gap-2 rounded-xl bg-surface px-3 py-2 sm:flex">
              <LayoutGrid className="h-3.5 w-3.5 text-ink-3" />
              <input
                type="range"
                min={0}
                max={SIZE_PRESETS.length - 1}
                value={sizeIdx}
                onChange={(e) => setSizeIdx(Number(e.target.value))}
                className="h-1 w-24 cursor-pointer accent-brand"
                aria-label="Madhësia e pamjes"
              />
            </div>}
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6">
          {!picker && <StorageUsage className="mb-5 md:hidden" />}
          {!picker && category === "published" ? <MyPublications /> : <>
          {libraryError && <div role="alert" className="mb-4 text-sm text-ink-2">Krijimet nga workspace-et nuk u ngarkuan plotësisht. <button type="button" className="underline" onClick={() => setRefresh(value => value + 1)}>Provo përsëri</button></div>}
          {libraryLoading && <p role="status" className="mb-4 text-sm text-ink-3">Duke ngarkuar krijimet…</p>}
          {category === "uploaded" && uploadError && <div role="alert" className="mb-4 text-sm text-ink-2">Ngarkimet nuk u hapën. <button type="button" className="underline" onClick={() => setRefresh(value => value + 1)}>Provo përsëri</button></div>}
          {category === "uploaded" && uploadsLoading && <p role="status" className="mb-4 text-sm text-ink-3">Duke ngarkuar asetet…</p>}
          {groups.length === 0 && !uploadsLoading && !libraryLoading ? (
            <div className="grid place-items-center rounded-2xl bg-surface py-24 text-center">
              <LayoutGrid className="h-8 w-8 text-ink-3" />
              <p className="mt-3 text-[15px] font-semibold text-ink">Asnjë aset këtu</p>
              <p className="mt-1 text-[13.5px] text-ink-3">
                {query ? "Provo një kërkim tjetër." : category === "uploaded" ? "Ngarko një imazh nga promptbox-i dhe do të shfaqet këtu." : category === "saved" ? "Ruaj krijimet me zemrën dhe do të shfaqen këtu." : "Gjenero diçka dhe do të shfaqet këtu."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map((g) => (
                <section key={g.key}>
                  <h2 className="mb-3 text-[14px] font-bold tracking-[-0.01em] text-ink">{g.label}</h2>
                  <div
                    className="grid w-full gap-3"
                    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${minW}px, 100%), 1fr))` }}
                  >
                    {g.items.map((r, i) => (
                      <AssetCard key={r.kind + r.id} row={r} index={i} workspaceLabel={workspaceLabel(r)} onOpen={() => void openRow(r)} onDelete={() => setPendingDelete([r])} onRename={(name) => r.kind === "creation" ? patchCreation(r.creation, { title: name }) : r.kind === "project" ? changeProject(r.project, { name }) : undefined} onToggleFav={() => r.kind === "creation" ? patchCreation(r.creation, { favourite: !r.favourite }) : r.kind === "project" ? changeProject(r.project, { favourite: !r.favourite }) : undefined} selecting={selecting} bytes={r.kind === "upload" ? r.asset.bytes : metadata[libraryStorageRef(rowReference(r), userId) ?? ""]} picker={Boolean(picker)} selected={picker ? selected.some(item => item.storageRef === selectionFor(r)?.storageRef) : chosen.has(rowKey(r))} disabled={deleting || Boolean(picker && (!selectionFor(r) || picker.excludeRefs.includes(selectionFor(r)!.storageRef) || (selected.length >= picker.limit && !selected.some(item => item.storageRef === selectionFor(r)?.storageRef))))} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {category === "uploaded" && nextOffset !== null && <Button variant="secondary" className="mt-4" loading={uploadsLoading} onClick={() => void loadMore()}>Shfaq më shumë</Button>}
          {!picker && category === "saved" && <div className="mt-8"><h2 className="mb-4 text-sm font-semibold text-ink">Të ruajtura nga Explore</h2><ExploreFeed savedOnly hideAuthorFilter /></div>}
          </>}
        </div>
      </div>
      </div>
      <AnimatePresence>
        {!picker && selecting && !actionsVisible && category !== "published" && <motion.div key="mobile-asset-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }} className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 rounded-maro16 bg-surface p-3 shadow-float md:hidden" aria-label="Asetet e zgjedhura">
          <span className="text-sm text-ink-2">{chosen.size} të zgjedhura</span>
          <div className="flex gap-2"><Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} disabled={!chosen.size || deleting} onClick={() => setPendingDelete(filtered.filter(row => chosen.has(rowKey(row))))}>Fshi</Button><Button variant="secondary" size="sm" disabled={deleting} onClick={() => { setSelecting(false); setChosen(new Set()); }}>Anulo</Button></div>
        </motion.div>}
      </AnimatePresence>
      {picker && <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-5 py-4"><p className="text-sm text-ink-2">{selected.length} / {picker.limit} të zgjedhura</p><Button disabled={!selected.length} onClick={() => picker.onSelect(selected)}>Shtoje</Button></div>}

      {lightbox && (
        <CreationLightbox creation={lightbox} open={lightbox !== null} onClose={() => setLightbox(null)} />
      )}
      <Modal open={Boolean(pendingDelete.length)} onClose={() => { if (!deleting) setPendingDelete([]); }} size="sm" closeOnBackdrop={!deleting} aria-label="Fshi asetet">
        <ModalHeader title={pendingDelete.length === 1 ? "Fshi këtë aset?" : `Fshi ${pendingDelete.length} asete?`} description="Fshihen vetëm asetet që ke zgjedhur. Ky veprim nuk mund të kthehet." />
        <ModalFooter><Button variant="secondary" disabled={deleting} onClick={() => setPendingDelete([])}>Anulo</Button><Button variant="danger" loading={deleting} onClick={() => void confirmDelete()}>Fshi</Button></ModalFooter>
      </Modal>
    </div>
  );
}

function AssetFilter({ label, value, options, onChange, className, align = "left" }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; className?: string; align?: "left" | "right";
}) {
  return <Dropdown className={className} align={align} trigger={<button type="button" aria-label={label} className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-maro12 bg-surface px-3 text-left text-[13px] font-semibold text-ink hover:bg-surface-hover"><span className="truncate">{options.find(option => option.value === value)?.label ?? "Të gjitha"}</span><ChevronDown className="h-4 w-4 shrink-0 text-ink-3" /></button>} items={options.map(option => ({ label: option.label, icon: <Check className={cn("h-4 w-4", option.value !== value && "opacity-0")} />, onClick: () => onChange(option.value) }))} />;
}

function RailItem({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-semibold transition-colors",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      )}
    >
      <span className={cn(active ? "text-brand" : "text-ink-3")}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-[12px] font-semibold text-ink-3">{count}</span>}
    </button>
  );
}

function AssetCard({ row, index, onOpen, onDelete, onRename, onToggleFav, workspaceLabel, picker, selecting, selected, disabled, bytes }: { row: Row; index: number; onOpen: () => void; onDelete: () => void; onRename: (name: string) => void; onToggleFav: () => void; workspaceLabel: string; picker?: boolean; selecting?: boolean; selected?: boolean; disabled?: boolean; bytes?: number | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: disabled ? 0.3 : 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.25) }}
      className="group relative overflow-hidden rounded-2xl bg-surface-2"
    >
      <div className="relative">
      <button onClick={onOpen} disabled={disabled} aria-label={selecting ? `Zgjedh ${rowFilename(row)}` : row.title} aria-pressed={picker || selecting ? selected : undefined} className="block aspect-[4/3] w-full">
        <AssetThumb row={row} />
      </button>

      {(picker || selecting) && <span className={cn("pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full", selected ? "bg-brand text-brand-fg" : "bg-black/50 text-white")}><Check className={cn("h-4 w-4", !selected && "opacity-30")} /></span>}
      {/* Bottom gradient with title */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pb-2.5 pt-8">
        <div className="flex items-center gap-1.5">
          <span className="text-white/80">
            <ToolIcon toolId={row.toolId} media={row.kind === "creation" ? row.media : undefined} className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-[12.5px] font-semibold text-white">{row.title}</span>
        </div>
      </div>

      {/* Fort badge */}
      {row.fort && (
        <span
          className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white"
          style={{ background: "#ff0000" }}
        >
          <Sparkles className="h-3 w-3" /> Fort
        </span>
      )}

      {/* Favourite marker */}
      {!picker && !selecting && row.favourite && (
        <span className="absolute right-10 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white">
          <Heart className="h-3.5 w-3.5 fill-current" />
        </span>
      )}

      {/* Always visible, including on touch screens. */}
      {!picker && !selecting && !disabled && <div className="absolute right-1.5 top-1.5">
        <div className="rounded-lg bg-black/45">
          <RowMenu row={row} onDelete={onDelete} onRename={onRename} onToggleFav={onToggleFav} />
        </div>
      </div>}
      </div>
      <div className="px-3 py-2.5"><p className="truncate text-[11px] leading-4 text-ink-2" title={rowFilename(row)}>{rowFilename(row)}</p><p className="mt-0.5 text-[10px] leading-4 text-ink-3">{formatAssetBytes(bytes)}</p><p className="mt-1 truncate text-[11px] leading-4 text-ink-2" title={workspaceLabel}>{workspaceLabel}</p></div>
    </motion.div>
  );
}

function AssetThumb({ row }: { row: Row }) {
  if (row.kind === "upload") return <StableImage src={row.asset.url} alt="" className="h-full w-full object-cover" />;
  if (row.kind === "project") {
    return <PreviewThumb project={row.project} height="100%" />;
  }
  if (row.media === "image") {
    return <StableImage src={row.creation.urls[row.imageIndex ?? 0]} module={row.toolId} refreshKey={row.creation.storageRefs?.[row.imageIndex ?? 0] ?? row.id} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />;
  }
  return <PreviewFallback module={row.media} />;
}

function RowMenu({ row, onDelete, onRename, onToggleFav }: { row: Row; onDelete: () => void; onRename: (name: string) => void; onToggleFav: () => void }) {
  const { activeWorkspace, workspaces, updateWorkspace } = useWorkspace();
  const { toast } = useToast();

  if (row.kind === "upload") return <ItemMenu onDelete={onDelete} />;
  if (row.kind === "project") {
    return (
      <ItemMenu
        favourite={row.project.favourite}
        onRename={() => {
          const v = window.prompt("Riemërto", row.title);
          if (v && v.trim()) onRename(v.trim());
        }}
        onToggleFav={onToggleFav}
        onDelete={onDelete}
      />
    );
  }
  const logoUrl = row.creation.urls[row.imageIndex ?? 0];
  const targetWorkspace = workspaces.find(workspace => workspace.id === row.creation.workspaceId) ?? (!row.creation.workspaceId ? activeWorkspace : null);
  const canPromoteLogo = row.media === "image" && Boolean(logoUrl) && Boolean(targetWorkspace);

  return (
    <ItemMenu
      favourite={row.creation.favourite}
      onRename={() => {
        const v = window.prompt("Riemërto", row.title);
        if (v && v.trim()) onRename(v.trim());
      }}
      onToggleFav={onToggleFav}
      onDelete={onDelete}
      extraActions={
        canPromoteLogo
          ? [
              {
                label: "Vendos si logo e workspace",
                onClick: async () => {
                  if (!targetWorkspace || !logoUrl) return;
                  await updateWorkspace(targetWorkspace.id, {
                    brand: normalizeWorkspaceBrand({
                      ...targetWorkspace.brand,
                      logoUrl,
                    }),
                  });
                  toast("Logo u vendos si brand i workspace.");
                },
              },
            ]
          : undefined
      }
    />
  );
}
