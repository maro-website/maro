"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { ItemMenu } from "@/components/app/cards";
import { useMaro } from "@/context/store";
import { TOOLS, getTool } from "@/lib/tools/registry";
import { initials, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Project, ImageCreation } from "@/lib/types";
import {
  Plus,
  Coins,
  Shield,
  LogOut,
  User as UserIcon,
  Home,
  Star,
  X,
  Check,
} from "lucide-react";

function projectHref(status: string, id: string) {
  return status === "generating" ? `/projects/${id}/generating` : `/projects/${id}/editor`;
}

export function HomeSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, credits, projects, creations, signOut } = useMaro();

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-5">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <Logo />
        </Link>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 lg:hidden"
            aria-label="Mbyll"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-3 pt-5">
        <button
          onClick={() => go("/")}
          className="flex w-full items-center gap-2 rounded-xl bg-brand px-4 py-3 text-[15px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-5 w-5" /> Krijim i ri
        </button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto scroll-thin px-3">
        {/* Primary nav */}
        <div className="mb-4 flex flex-col gap-0.5">
          <NavItem
            active={pathname === "/"}
            icon={<Home className="h-5 w-5" />}
            label="Hub"
            onClick={() => go("/")}
          />
          <NavItem
            active={pathname === "/favourites"}
            icon={<Star className="h-5 w-5" />}
            label="Të preferuarat"
            onClick={() => go("/favourites")}
          />
          {TOOLS.map((t) => (
            <NavItem
              key={t.id}
              active={pathname === t.route}
              icon={<t.icon className="h-5 w-5" />}
              label={t.name}
              onClick={() => go(t.route)}
            />
          ))}
        </div>

        {/* Website projects */}
        {projects.length > 0 && (
          <>
            <SectionLabel>Website-t</SectionLabel>
            <div className="mb-4 flex flex-col gap-1">
              {projects.slice(0, 8).map((p) => (
                <SidebarProjectRow key={p.id} project={p} onOpen={() => go(projectHref(p.status, p.id))} />
              ))}
            </div>
          </>
        )}

        {/* Recent images */}
        {creations.length > 0 && (
          <>
            <SectionLabel>Imazhet</SectionLabel>
            <div className="mb-2 flex flex-col gap-1">
              {creations.slice(0, 8).map((c) => {
                const tool = getTool(c.toolId);
                return (
                  <SidebarCreationRow
                    key={c.id}
                    creation={c}
                    onOpen={() => go(tool?.route ?? "/")}
                  />
                );
              })}
            </div>
          </>
        )}

        {projects.length === 0 && creations.length === 0 && (
          <div className="px-2 py-2 text-[13.5px] leading-relaxed text-ink-3">
            Ende s&apos;ke krijime. Zgjidh një tool lart dhe fillo.
          </div>
        )}
      </div>

      {/* Footer: account */}
      <div className="border-t border-line p-3">
        {user ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-[13px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <Coins className="h-4 w-4 text-brand" /> {credits}
              </span>
              <span className="text-ink-3">kredite</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => go("/account")}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
                  style={{ background: user.avatarColor }}
                >
                  {initials(user.name)}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{user.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{user.email}</span>
                </span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => go("/admin")}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line-strong text-ink-2 transition-colors hover:bg-surface-2"
                  title="Admin"
                >
                  <Shield className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={async () => {
                  await signOut();
                  go("/");
                }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line-strong text-ink-2 transition-colors hover:bg-surface-2"
                title="Dil"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => go("/sign-in")}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-2"
            )}
          >
            <UserIcon className="h-5 w-5" /> Hyr / Regjistrohu
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Sidebar rows (compact cards with 3-dot menu) --------------------------

function RowShell({
  thumb,
  title,
  subtitle,
  favourite,
  editing,
  editInitial,
  onOpen,
  onSaveName,
  onCancel,
  menu,
}: {
  thumb: React.ReactNode;
  title: string;
  subtitle: string;
  favourite?: boolean;
  editing: boolean;
  editInitial: string;
  onOpen: () => void;
  onSaveName: (v: string) => void;
  onCancel: () => void;
  menu: React.ReactNode;
}) {
  const [value, setValue] = React.useState(editInitial);
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (editing) {
      setValue(editInitial);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, editInitial]);

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-brand bg-surface px-2 py-1.5">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveName(value.trim() || editInitial);
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
        />
        <button
          onClick={() => onSaveName(value.trim() || editInitial)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-brand hover:bg-brand-soft"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="relative shrink-0">
          {thumb}
          {favourite && (
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-brand shadow-sm">
              <Star className="h-2.5 w-2.5 fill-brand" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{title}</span>
          <span className="block truncate text-[12px] text-ink-3">{subtitle}</span>
        </span>
      </button>
      <div className="opacity-0 transition-opacity group-hover:opacity-100">{menu}</div>
    </div>
  );
}

function SidebarProjectRow({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const { renameProject, deleteProject, toggleFavouriteProject } = useMaro();
  const [editing, setEditing] = React.useState(false);
  return (
    <RowShell
      thumb={
        <span
          className="grid h-9 w-9 place-items-center rounded-lg text-[12px] font-bold text-white"
          style={{ background: project.theme?.primaryColor ?? "#6b46e5" }}
        >
          {initials(project.name)}
        </span>
      }
      title={project.name}
      subtitle={project.status === "generating" ? "Po gjenerohet…" : timeAgo(project.updatedAt)}
      favourite={project.favourite}
      editing={editing}
      editInitial={project.name}
      onOpen={onOpen}
      onSaveName={(v) => {
        renameProject(project.id, v);
        setEditing(false);
      }}
      onCancel={() => setEditing(false)}
      menu={
        <ItemMenu
          favourite={project.favourite}
          onRename={() => setEditing(true)}
          onToggleFav={() => toggleFavouriteProject(project.id)}
          onDelete={() => deleteProject(project.id)}
        />
      }
    />
  );
}

function SidebarCreationRow({ creation, onOpen }: { creation: ImageCreation; onOpen: () => void }) {
  const { renameCreation, deleteCreation, toggleFavouriteCreation } = useMaro();
  const [editing, setEditing] = React.useState(false);
  const tool = getTool(creation.toolId);
  const title = creation.title || creation.prompt || tool?.name || "Imazh";
  return (
    <RowShell
      thumb={
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2">
          {creation.urls[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creation.urls[0]} alt="" className="h-full w-full object-cover" />
          )}
        </span>
      }
      title={title}
      subtitle={`${tool?.name ?? "Imazh"} · ${timeAgo(creation.createdAt)}`}
      favourite={creation.favourite}
      editing={editing}
      editInitial={title}
      onOpen={onOpen}
      onSaveName={(v) => {
        renameCreation(creation.id, v);
        setEditing(false);
      }}
      onCancel={() => setEditing(false)}
      menu={
        <ItemMenu
          favourite={creation.favourite}
          onRename={() => setEditing(true)}
          onToggleFav={() => toggleFavouriteCreation(creation.id)}
          onDelete={() => deleteCreation(creation.id)}
        />
      }
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">
      {children}
    </div>
  );
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      )}
    >
      <span className={cn("shrink-0", active ? "text-brand" : "text-ink-3")}>{icon}</span>
      {label}
    </button>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 left-0 w-[284px] border-r border-line bg-canvas"
          >
            <HomeSidebar onNavigate={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
