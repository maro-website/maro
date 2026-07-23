"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { ItemMenu, CreationLightbox } from "@/components/app/cards";
import { useMaro } from "@/context/store";
import { MAIN_TOOLS, getTool } from "@/lib/tools/registry";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ImageCreation, Project } from "@/lib/types";
import {
  History,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Globe,
  AudioLines,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

const PAGE_SIZE = 50;

type Row =
  | { kind: "project"; id: string; title: string; toolId: string; toolName: string; time: string; fort: boolean; project: Project }
  | { kind: "creation"; id: string; title: string; toolId: string; toolName: string; time: string; fort: boolean; media: "image" | "audio" | "text"; creation: ImageCreation };

function ToolIcon({ toolId, media }: { toolId: string; media?: "image" | "audio" | "text" }) {
  if (toolId === "website") return <Globe className="h-4 w-4" />;
  if (media === "audio") return <AudioLines className="h-4 w-4" />;
  if (media === "text") return <FileText className="h-4 w-4" />;
  const tool = getTool(toolId);
  const Icon = tool?.icon ?? ImageIcon;
  return <Icon className="h-4 w-4" />;
}

function KrijimetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, creations } = useMaro();

  const [toolFilter, setToolFilter] = React.useState<string>(searchParams.get("tool") ?? "all");
  const [query, setQuery] = React.useState("");
  const [fortFilter, setFortFilter] = React.useState<"all" | "with" | "without">("all");
  const [page, setPage] = React.useState(0);
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
        media: c.mediaType ?? "image",
        creation: c,
      };
    });
    return [...projRows, ...creaRows].sort((a, b) => +new Date(b.time) - +new Date(a.time));
  }, [projects, creations]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (toolFilter !== "all" && r.toolId !== toolFilter) return false;
      if (fortFilter === "with" && !r.fort) return false;
      if (fortFilter === "without" && r.fort) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, toolFilter, fortFilter, query]);

  React.useEffect(() => setPage(0), [toolFilter, fortFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const openRow = (r: Row) => {
    if (r.kind === "project") {
      const href = r.project.status === "generating" ? `/projects/${r.id}/generating` : `/projects/${r.id}/editor`;
      router.push(href);
    } else if (r.media === "image" || r.media === "audio" || r.media === "text") {
      setLightbox(r.creation);
    }
  };

  const toolOptions = [{ id: "all", name: "Të gjitha" }, ...MAIN_TOOLS.map((t) => ({ id: t.id, name: t.name }))];

  return (
    <div className="relative h-full overflow-y-auto scroll-thin">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] bg-aurora" />
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-brand">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">Çka ke maru</h1>
            <p className="text-[13.5px] text-ink-3">Të gjitha krijimet e tua në një vend.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line-strong bg-surface px-4 py-2.5">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko sipas titullit…"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="rounded-2xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none"
            >
              {toolOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={fortFilter}
              onChange={(e) => setFortFilter(e.target.value as "all" | "with" | "without")}
              className="rounded-2xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none"
            >
              <option value="all">maroFort: të gjitha</option>
              <option value="with">Me maroFort</option>
              <option value="without">Pa maroFort</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden grid-cols-[1fr_160px_140px_120px_44px] items-center gap-3 border-b border-line px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-ink-3 sm:grid">
            <span>Titulli</span>
            <span>Tool</span>
            <span>Krijuar</span>
            <span>maroFort</span>
            <span />
          </div>

          {pageRows.length === 0 ? (
            <div className="px-5 py-16 text-center text-[13.5px] text-ink-3">
              Asnjë krijim nuk përputhet me filtrat.
            </div>
          ) : (
            pageRows.map((r, i) => (
              <motion.div
                key={r.kind + r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                className={cn(
                  "group grid grid-cols-[1fr_44px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:grid-cols-[1fr_160px_140px_120px_44px]",
                  i !== pageRows.length - 1 && "border-b border-line"
                )}
              >
                <button onClick={() => openRow(r)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2">
                    <ToolIcon toolId={r.toolId} media={r.kind === "creation" ? r.media : undefined} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{r.title}</span>
                    <span className="block truncate text-[12px] text-ink-3 sm:hidden">
                      {r.toolName} · {timeAgo(r.time)}
                    </span>
                  </span>
                </button>
                <span className="hidden text-[13px] text-ink-2 sm:block">{r.toolName}</span>
                <span className="hidden text-[13px] text-ink-3 sm:block">{timeAgo(r.time)}</span>
                <span className="hidden sm:block">
                  {r.fort ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-c-red/10 px-2 py-0.5 text-[11.5px] font-bold text-c-red">
                      <Sparkles className="h-3 w-3" /> Fort
                    </span>
                  ) : (
                    <span className="text-[13px] text-ink-3">—</span>
                  )}
                </span>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <RowMenu row={r} />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] text-ink-3">
              {filtered.length} krijime · faqja {current + 1}/{pageCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={current === 0}
                className="grid h-9 w-9 place-items-center rounded-xl border border-line-strong bg-surface text-ink-2 transition-colors hover:bg-surface-2 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={current >= pageCount - 1}
                className="grid h-9 w-9 place-items-center rounded-xl border border-line-strong bg-surface text-ink-2 transition-colors hover:bg-surface-2 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <CreationLightbox creation={lightbox} open={lightbox !== null} onClose={() => setLightbox(null)} />
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
