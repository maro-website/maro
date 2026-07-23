"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMaro } from "@/context/store";
import { getTool } from "@/lib/tools/registry";
import { initials, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Project, ImageCreation } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { trackEvent } from "@/lib/services/trackService";
import { submitReport } from "@/lib/services/reportService";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Star,
  Check,
  X,
  Copy,
  Download,
  ThumbsUp,
  ThumbsDown,
  Flag,
  AudioLines,
  FileText,
} from "lucide-react";

// A small helper: a creation's media kind (defaults to image for legacy items).
function mediaOf(c: ImageCreation): "image" | "audio" | "text" {
  return c.mediaType ?? "image";
}

// Thumbnail block used by cards. Renders the image, or an icon placeholder for
// audio / transcription creations.
function CreationThumb({ creation, className }: { creation: ImageCreation; className?: string }) {
  const media = mediaOf(creation);
  if (media === "image") {
    return creation.urls[0] ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={creation.urls[0]} alt="" className={cn("h-full w-full object-cover", className)} />
    ) : null;
  }
  return (
    <span className="grid h-full w-full place-items-center text-ink-3">
      {media === "audio" ? <AudioLines className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
    </span>
  );
}

// ---- 3-dot menu (Rename / Favourite / Delete) -----------------------------
// The dropdown is rendered in a portal with fixed positioning so it never gets
// clipped by a card's `overflow-hidden` or a scroll container.

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
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const place = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 200;
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 6, left });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, place]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={btnRef}
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
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                style={{ position: "fixed", top: pos.top, left: pos.left, width: 200 }}
                className="z-[120] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
                onClick={(e) => e.stopPropagation()}
              >
                <MenuRow icon={<Pencil className="h-4 w-4" />} onClick={() => run(onRename)}>
                  Riemërto
                </MenuRow>
                <MenuRow
                  icon={<Star className={cn("h-4 w-4", favourite && "fill-brand text-brand")} />}
                  onClick={() => run(onToggleFav)}
                >
                  {favourite ? "Hiq të preferuarën" : "Shto te të preferuarat"}
                </MenuRow>
                <div className="my-1 h-px bg-line" />
                <MenuRow icon={<Trash2 className="h-4 w-4" />} danger onClick={() => run(onDelete)}>
                  Fshi
                </MenuRow>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
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
    <div className="group relative rounded-2xl border border-line bg-surface shadow-subtle transition-shadow hover:shadow-pop">
      <button
        onClick={() => onOpen(project)}
        className="block w-full text-left"
      >
        <div
          className="grid h-32 w-full place-items-center rounded-t-2xl text-[26px] font-black text-white"
          style={{ background: project.theme?.primaryColor ?? "#6b46e5" }}
        >
          {initials(project.name)}
        </div>
      </button>
      {project.favourite && (
        <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-brand shadow-sm">
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
  onOpen?: (c: ImageCreation) => void;
}) {
  const { renameCreation, deleteCreation, toggleFavouriteCreation } = useMaro();
  const [editing, setEditing] = React.useState(false);
  const [lightbox, setLightbox] = React.useState(false);
  const tool = getTool(creation.toolId);
  const title = creation.title || creation.prompt || tool?.name || "Imazh";
  return (
    <div className="group relative rounded-2xl border border-line bg-surface shadow-subtle transition-shadow hover:shadow-pop">
      <button
        onClick={() => (onOpen ? onOpen(creation) : setLightbox(true))}
        className="block w-full"
      >
        <div className="aspect-square w-full overflow-hidden rounded-t-2xl bg-surface-2">
          <CreationThumb creation={creation} />
        </div>
      </button>
      <CreationLightbox
        creation={creation}
        open={lightbox}
        onClose={() => setLightbox(false)}
      />
      {creation.favourite && (
        <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-brand shadow-sm">
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

// Compact horizontal row (thumbnail + title + time + 3-dot menu). Used for the
// past-generations list on mobile so items don't take up huge squares.
export function CreationListRow({ creation }: { creation: ImageCreation }) {
  const { renameCreation, deleteCreation, toggleFavouriteCreation } = useMaro();
  const [editing, setEditing] = React.useState(false);
  const [lightbox, setLightbox] = React.useState(false);
  const tool = getTool(creation.toolId);
  const title = creation.title || creation.prompt || tool?.name || "Imazh";
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-1">
      <button
        onClick={() => setLightbox(true)}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2"
      >
        <CreationThumb creation={creation} />
        {creation.favourite && (
          <span className="absolute left-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-surface/90 text-brand shadow-sm">
            <Star className="h-2.5 w-2.5 fill-brand" />
          </span>
        )}
      </button>
      <CreationLightbox creation={creation} open={lightbox} onClose={() => setLightbox(false)} />
      {editing ? (
        <div className="min-w-0 flex-1 pr-2">
          <RenameInput
            initial={title}
            onCancel={() => setEditing(false)}
            onSave={(v) => {
              renameCreation(creation.id, v);
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <>
          <button onClick={() => setLightbox(true)} className="min-w-0 flex-1 text-left">
            <div className="truncate text-[14px] font-semibold text-ink">{title}</div>
            <div className="truncate text-[12px] text-ink-3">
              {tool?.name} · {timeAgo(creation.createdAt)}
            </div>
          </button>
          <ItemMenu
            favourite={creation.favourite}
            onRename={() => setEditing(true)}
            onToggleFav={() => toggleFavouriteCreation(creation.id)}
            onDelete={() => deleteCreation(creation.id)}
          />
        </>
      )}
    </div>
  );
}

// ---- Image lightbox (full image + prompt + copy + download + publish) ------

export function CreationLightbox({
  creation,
  open,
  onClose,
}: {
  creation: ImageCreation;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { toggleFavouriteCreation } = useMaro();
  const tool = getTool(creation.toolId);
  const media = mediaOf(creation);
  const [active, setActive] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setActive(0);
      setCopied(false);
      void trackEvent({
        kind: "view",
        toolId: creation.toolId,
        prompt: creation.prompt || "",
        url: creation.urls[0],
      });
    }
  }, [open, creation.id]);

  const url = creation.urls[active] ?? creation.urls[0];

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(creation.prompt || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      void trackEvent({
        kind: "copy",
        toolId: creation.toolId,
        prompt: creation.prompt || "",
        url: creation.urls[0],
      });
    } catch {
      toast("Nuk u kopjua dot.");
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `maro-${creation.id}.${media === "audio" ? "mp3" : "png"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      window.open(url, "_blank");
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(creation.text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Nuk u kopjua dot.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" className="max-w-3xl">
      <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
        <div className="grid place-items-center bg-surface-2 p-4">
          {media === "audio" ? (
            <div className="flex w-full flex-col items-center gap-4 py-8">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-soft text-brand">
                <AudioLines className="h-9 w-9" />
              </span>
              {url && <audio controls src={url} className="w-full max-w-sm" />}
            </div>
          ) : media === "text" ? (
            <div className="scroll-thin max-h-[70vh] w-full overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface p-4 text-[15px] leading-relaxed text-ink">
              {creation.text || "Pa tekst"}
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="max-h-[70vh] w-full rounded-xl object-contain"
              />
              {creation.urls.length > 1 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {creation.urls.map((u, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={cn(
                        "h-12 w-12 overflow-hidden rounded-lg border-2",
                        i === active ? "border-brand" : "border-line"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-brand">
            {tool?.icon && <tool.icon className="h-4 w-4" />}
            {tool?.name ?? "Imazh"}
          </div>
          <div className="mt-3 text-[12px] font-bold uppercase tracking-wider text-ink-3">
            Prompt
          </div>
          <div className="group/prompt relative mt-1.5">
            <div className="scroll-thin h-28 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3 pr-16 text-[13.5px] leading-relaxed text-ink-2">
              {creation.prompt || "Pa prompt"}
            </div>
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/prompt:opacity-100">
              <PromptHoverIcon
                label={creation.favourite ? "Hiq nga të preferuarat" : "Shto te të preferuarat"}
                active={creation.favourite}
                onClick={() => toggleFavouriteCreation(creation.id)}
              >
                <Star className={cn("h-4 w-4", creation.favourite && "fill-brand text-brand")} />
              </PromptHoverIcon>
              <PromptHoverIcon label="Kopjo prompt" onClick={copyPrompt}>
                {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
              </PromptHoverIcon>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {media === "text" ? (
              <button
                onClick={copyText}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
                {copied ? "U kopjua" : "Kopjo tekstin"}
              </button>
            ) : (
              <>
                <button
                  onClick={copyPrompt}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
                  {copied ? "U kopjua" : "Kopjo prompt"}
                </button>
                <button
                  onClick={download}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Shkarko
                </button>
              </>
            )}

            <ReportControls creation={creation} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---- Like / Dislike / Report (own generations only) -----------------------
function ReportControls({ creation }: { creation: ImageCreation }) {
  const { toast } = useToast();
  const { setCreationReaction } = useMaro();
  const [reportOpen, setReportOpen] = React.useState(false);
  const reaction = creation.reaction;

  const react = (next: "like" | "dislike") => {
    setCreationReaction(creation.id, reaction === next ? undefined : next);
  };

  return (
    <>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <button
          onClick={() => react("like")}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border transition-colors",
            reaction === "like" ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2 hover:text-ink"
          )}
          aria-label="Pëlqej"
          title="Pëlqej"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => react("dislike")}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border transition-colors",
            reaction === "dislike" ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2 hover:text-ink"
          )}
          aria-label="Nuk pëlqej"
          title="Nuk pëlqej"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
        <button
          onClick={() => setReportOpen(true)}
          className="ml-auto grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-2 transition-colors hover:text-ink"
          aria-label="Raporto"
          title="Raporto"
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        creation={creation}
        onDone={() => {
          setReportOpen(false);
          toast("Raporti u dërgua. Faleminderit!");
        }}
      />
    </>
  );
}

function ReportModal({
  open,
  onClose,
  creation,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  creation: ImageCreation;
  onDone: () => void;
}) {
  const { user } = useMaro();
  const { toast } = useToast();
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    if (!message.trim()) return toast("Shkruaj çka nuk shkoi.");
    setSending(true);
    const { error } = await submitReport({
      toolId: creation.toolId,
      kind: "image",
      targetId: creation.id,
      targetUrl: creation.urls[0],
      prompt: creation.prompt,
      message: message.trim(),
    });
    setSending(false);
    if (error) return toast("Gabim: " + error);
    setMessage("");
    onDone();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-ink">
            <Flag className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[16px] font-bold text-ink">Raporto gjenerimin</div>
            <div className="text-[12.5px] text-ink-3">Do ta shqyrtojmë dhe të kthejmë përgjigje.</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Email</div>
          <div className="rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink-2">
            {user?.email ?? "—"}
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Mesazhi</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Përshkruaj problemin…"
            className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line-strong bg-surface px-4 py-3 text-[14px] font-semibold text-ink hover:bg-surface-2"
          >
            Anulo
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
          >
            {sending ? "Duke dërguar…" : "Dërgo raportin"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Small hover icon used on prompt boxes (favourite / copy).
export function PromptHoverIcon({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-ink-2 shadow-subtle transition-colors hover:text-ink",
        active && "text-brand"
      )}
    >
      {children}
    </button>
  );
}
