"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMaro } from "@/context/store";
import { getTool } from "@/lib/tools/registry";
import { initials, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Project, ImageCreation } from "@/lib/types";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Star,
  Check,
  X,
} from "lucide-react";

// ---- 3-dot menu (Rename / Favourite / Delete) -----------------------------

export function ItemMenu({
  favourite,
  onRename,
  onToggleFav,
  onDelete,
  className,
}: {
  favourite?: boolean;
  onRename: () => void;
  onToggleFav: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Opsione"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
          >
            <MenuRow icon={<Pencil className="h-4 w-4" />} onClick={() => run(onRename)}>
              Riemërto
            </MenuRow>
            <MenuRow
              icon={
                <Star
                  className={cn("h-4 w-4", favourite && "fill-brand text-brand")}
                />
              }
              onClick={() => run(onToggleFav)}
            >
              {favourite ? "Hiq të preferuarën" : "Shto te të preferuarat"}
            </MenuRow>
            <div className="my-1 h-px bg-line" />
            <MenuRow
              icon={<Trash2 className="h-4 w-4" />}
              danger
              onClick={() => run(onDelete)}
            >
              Fshi
            </MenuRow>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({
  icon,
  children,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-surface-2"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ---- Inline rename input ---------------------------------------------------

function RenameInput({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = React.useState(initial);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const save = () => {
    const v = value.trim();
    if (v) onSave(v);
    else onCancel();
  };
  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onCancel();
        }}
        className="min-w-0 flex-1 rounded-lg border border-brand bg-surface px-2 py-1 text-[14px] text-ink outline-none"
      />
      <button
        onClick={save}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-brand hover:bg-brand-soft"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={onCancel}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---- Grid cards (Favourites page, galleries) ------------------------------

export function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: (p: Project) => void;
}) {
  const { renameProject, deleteProject, toggleFavouriteProject } = useMaro();
  const [editing, setEditing] = React.useState(false);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-subtle transition-shadow hover:shadow-pop">
      <button
        onClick={() => onOpen(project)}
        className="block w-full text-left"
      >
        <div
          className="grid h-32 w-full place-items-center text-[26px] font-black text-white"
          style={{ background: project.theme?.primaryColor ?? "#6b46e5" }}
        >
          {initials(project.name)}
        </div>
      </button>
      {project.favourite && (
        <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-brand shadow-sm">
          <Star className="h-4 w-4 fill-brand" />
        </span>
      )}
      <div className="flex items-center gap-2 p-3">
        {editing ? (
          <RenameInput
            initial={project.name}
            onCancel={() => setEditing(false)}
            onSave={(v) => {
              renameProject(project.id, v);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-ink">
                {project.name}
              </div>
              <div className="truncate text-[12px] text-ink-3">
                Website · {timeAgo(project.updatedAt)}
              </div>
            </div>
            <ItemMenu
              favourite={project.favourite}
              onRename={() => setEditing(true)}
              onToggleFav={() => toggleFavouriteProject(project.id)}
              onDelete={() => deleteProject(project.id)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function CreationCard({
  creation,
  onOpen,
}: {
  creation: ImageCreation;
  onOpen: (c: ImageCreation) => void;
}) {
  const { renameCreation, deleteCreation, toggleFavouriteCreation } = useMaro();
  const [editing, setEditing] = React.useState(false);
  const tool = getTool(creation.toolId);
  const title = creation.title || creation.prompt || tool?.name || "Imazh";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-subtle transition-shadow hover:shadow-pop">
      <button onClick={() => onOpen(creation)} className="block w-full">
        <div className="aspect-square w-full bg-surface-2">
          {creation.urls[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creation.urls[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </button>
      {creation.favourite && (
        <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-brand shadow-sm">
          <Star className="h-4 w-4 fill-brand" />
        </span>
      )}
      <div className="flex items-center gap-2 p-3">
        {editing ? (
          <RenameInput
            initial={title}
            onCancel={() => setEditing(false)}
            onSave={(v) => {
              renameCreation(creation.id, v);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-ink">
                {title}
              </div>
              <div className="truncate text-[12px] text-ink-3">
                {tool?.name} · {timeAgo(creation.createdAt)}
              </div>
            </div>
            <ItemMenu
              favourite={creation.favourite}
              onRename={() => setEditing(true)}
              onToggleFav={() => toggleFavouriteCreation(creation.id)}
              onDelete={() => deleteCreation(creation.id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
