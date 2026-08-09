"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { ItemMenu, CreationLightbox, creationConversationHref } from "@/components/app/cards";
import { useMaro } from "@/context/store";
import { getTool } from "@/lib/tools/registry";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ImageCreation, Project } from "@/lib/types";
import {
  Search,
  Sparkles,
  LayoutGrid,
  Heart,
  Globe,
  AudioLines,
  FileText,
  Image as ImageIcon,
  Play,
} from "lucide-react";

type Row =
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
    };

// Thumbnail-size presets driven by the top-right slider (like Higgsfield).
const SIZE_PRESETS = [148, 190, 240, 300];

function ToolIcon({ toolId, media, className }: { toolId: string; media?: "image" | "audio" | "text"; className?: string }) {
  const cls = className ?? "h-4 w-4";
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

function KrijimetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, creations } = useMaro();

  const [filter, setFilter] = React.useState<string>(searchParams.get("tool") ?? "all");
  const [query, setQuery] = React.useState("");
  const [sizeIdx, setSizeIdx] = React.useState(1);
  const [lightbox, setLightbox] = React.useState<ImageCreation | null>(null);

  const rows: Row[] = React.useMemo(() => {
    const projRows: Row[] = projects.map((p) => ({
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
    const creaRows: Row[] = creations.map((c) => {
      const tool = getTool(c.toolId);
      return {
        kind: "creation",
        id: c.id,
        title: c.title || c.prompt || tool?.name || "Krijim",
        toolId: c.toolId,
        toolName: tool?.name ?? "Krijim",
        time: c.createdAt,
        fort: false,
        favourite: Boolean(c.favourite),
        media: c.mediaType ?? "image",
        creation: c,
      };
    });
    return [...projRows, ...creaRows].sort((a, b) => +new Date(b.time) - +new Date(a.time));
  }, [projects, creations]);

  // Tool buckets that actually have items (for the left rail "Tools" group).
  const toolBuckets = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; media?: "image" | "audio" | "text" }>();
    for (const r of rows) {
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
  }, [rows]);

  const favCount = React.useMemo(() => rows.filter((r) => r.favourite).length, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "fav" && !r.favourite) return false;
      if (filter !== "all" && filter !== "fav" && r.toolId !== filter) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

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

  const openRow = (r: Row) => {
    if (r.kind === "project") {
      const href = r.project.status === "generating" ? `/projects/${r.id}/generating` : `/projects/${r.id}/editor`;
      router.push(href);
    } else {
      const href = creationConversationHref(r.creation);
      if (href) router.push(href);
      else setLightbox(r.creation);
    }
  };

  const minW = SIZE_PRESETS[sizeIdx];

  return (
    <div className="flex h-full min-w-0 overflow-x-clip max-lg:h-auto">
      {/* Left rail — asset library sections */}
      <aside className="hidden w-56 shrink-0 flex-col bg-surface/40 px-3 py-5 md:flex">
        <div className="px-2 pb-3 text-[13px] font-bold uppercase tracking-wider text-ink-3">
          Biblioteka
        </div>
        <RailItem
          active={filter === "all"}
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Të gjitha"
          count={rows.length}
          onClick={() => setFilter("all")}
        />
        <RailItem
          active={filter === "fav"}
          icon={<Heart className={cn("h-4 w-4", filter === "fav" && "fill-current")} />}
          label="Të preferuarat"
          count={favCount}
          onClick={() => setFilter("fav")}
        />

        {toolBuckets.length > 0 && (
          <>
            <div className="mt-5 px-2 pb-2 text-[12px] font-bold uppercase tracking-wider text-ink-3">
              Tools
            </div>
            {toolBuckets.map((t) => (
              <RailItem
                key={t.id}
                active={filter === t.id}
                icon={<ToolIcon toolId={t.id} media={t.media} />}
                label={t.name}
                count={t.count}
                onClick={() => setFilter(t.id)}
              />
            ))}
          </>
        )}
      </aside>

      {/* Main area */}
      <div className="relative min-w-0 flex-1 overflow-y-auto scroll-thin">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[220px] bg-aurora" />

        {/* Sticky toolbar */}
        <div className="sticky top-0 z-10 bg-canvas/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kërko…"
                className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>
            {/* Mobile filter dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl bg-surface px-3 py-2 text-[13.5px] font-medium text-ink outline-none md:hidden"
            >
              <option value="all">Të gjitha</option>
              <option value="fav">Të preferuarat</option>
              {toolBuckets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {/* Size slider */}
            <div className="hidden items-center gap-2 rounded-xl bg-surface px-3 py-2 sm:flex">
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
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6">
          {groups.length === 0 ? (
            <div className="grid place-items-center rounded-2xl bg-surface py-24 text-center">
              <LayoutGrid className="h-8 w-8 text-ink-3" />
              <p className="mt-3 text-[15px] font-semibold text-ink">Asnjë krijim këtu</p>
              <p className="mt-1 text-[13.5px] text-ink-3">
                {query ? "Provo një kërkim tjetër." : "Gjenero diçka dhe do të shfaqet këtu."}
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
                      <AssetCard key={r.kind + r.id} row={r} index={i} onOpen={() => openRow(r)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <CreationLightbox creation={lightbox} open={lightbox !== null} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
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
  count: number;
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
      <span className="text-[12px] font-semibold text-ink-3">{count}</span>
    </button>
  );
}

function AssetCard({ row, index, onOpen }: { row: Row; index: number; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.25) }}
      className="group relative overflow-hidden rounded-2xl bg-surface-2 transition-colors"
    >
      <button onClick={onOpen} className="block aspect-[4/3] w-full">
        <AssetThumb row={row} />
      </button>

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
      {row.favourite && (
        <span className="absolute right-10 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
          <Heart className="h-3.5 w-3.5 fill-current" />
        </span>
      )}

      {/* Hover menu */}
      <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded-lg bg-black/45 backdrop-blur">
          <RowMenu row={row} />
        </div>
      </div>
    </motion.div>
  );
}

function AssetThumb({ row }: { row: Row }) {
  if (row.kind === "project") {
    return (
      <div
        className="grid h-full w-full place-items-center text-[28px] font-black text-white"
        style={{ background: row.project.theme?.primaryColor ?? "#0f1419" }}
      >
        {initials(row.title)}
      </div>
    );
  }
  if (row.media === "image" && row.creation.urls[0]) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.creation.urls[0]}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    );
  }
  return (
    <div className="grid h-full w-full place-items-center text-ink-3">
      {row.media === "audio" ? (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-brand">
          <Play className="h-5 w-5" />
        </span>
      ) : (
        <FileText className="h-8 w-8" />
      )}
    </div>
  );
}

function RowMenu({ row }: { row: Row }) {
  const {
    renameProject,
    deleteProject,
    toggleFavouriteProject,
    renameCreation,
    deleteCreation,
    toggleFavouriteCreation,
  } = useMaro();

  if (row.kind === "project") {
    return (
      <ItemMenu
        favourite={row.project.favourite}
        onRename={() => {
          const v = window.prompt("Riemërto", row.title);
          if (v && v.trim()) renameProject(row.id, v.trim());
        }}
        onToggleFav={() => toggleFavouriteProject(row.id)}
        onDelete={() => deleteProject(row.id)}
      />
    );
  }
  return (
    <ItemMenu
      favourite={row.creation.favourite}
      onRename={() => {
        const v = window.prompt("Riemërto", row.title);
        if (v && v.trim()) renameCreation(row.id, v.trim());
      }}
      onToggleFav={() => toggleFavouriteCreation(row.id)}
      onDelete={() => deleteCreation(row.id)}
    />
  );
}

export default function KrijimetPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <KrijimetInner />
      </React.Suspense>
    </AppShell>
  );
}
