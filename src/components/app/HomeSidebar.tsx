"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { ItemMenu } from "@/components/app/cards";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AvatarCropper } from "@/components/app/AvatarCropper";
import { useMaro } from "@/context/store";
import { useTheme, type Theme } from "@/context/theme";
import { useToast } from "@/components/ui/Toast";
import { MAIN_TOOLS, getTool } from "@/lib/tools/registry";
import { initials, timeAgo } from "@/lib/utils/format";
import { randomMaroLabel } from "@/lib/utils/maroButton";
import { cn } from "@/lib/utils/cn";
import type { Project, ImageCreation } from "@/lib/types";
import {
  Plus,
  Coins,
  Shield,
  LogOut,
  User as UserIcon,
  Star,
  X,
  Check,
  PanelLeftClose,
  Settings,
  ChevronLeft,
  Camera,
  Sun,
  Moon,
  Palette,
  RefreshCw,
  Wallet,
  Lightbulb,
  History,
  ChevronDown,
} from "lucide-react";

function projectHref(status: string, id: string) {
  return status === "generating" ? `/projects/${id}/generating` : `/projects/${id}/editor`;
}

export function HomeSidebar({
  onNavigate,
  onCollapse,
}: {
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, isCreator, credits, projects, creations, signOut } = useMaro();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  // A different playful label each refresh.
  const [maroLabel, setMaroLabel] = React.useState("maro");
  React.useEffect(() => setMaroLabel(randomMaroLabel()), []);

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-5">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <Logo showWord />
        </Link>
        <div className="flex items-center gap-1">
          {user && <NotificationBell />}
          <button
            onClick={() => window.location.reload()}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Rifresko faqen"
            title="Rifresko (nëse kreditet nuk ngarkohen)"
          >
            <RefreshCw className="h-[18px] w-[18px]" />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="hidden h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:grid"
              aria-label="Mbyll sidebar"
              title="Mbyll sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
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
      </div>

      <div className="px-3 pt-5">
        <button
          onClick={() => go("/")}
          className="flex w-full items-center gap-2 rounded-xl bg-brand px-4 py-3 text-[15px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-5 w-5 shrink-0" /> <span className="truncate">{maroLabel}</span>
        </button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto scroll-thin px-3">
        {/* Maro tools — the active tool expands to show its 3 latest items */}
        <div className="mb-3 flex flex-col gap-0.5">
          {MAIN_TOOLS.map((t) => (
            <ToolNav
              key={t.id}
              tool={t}
              active={pathname === t.route}
              projects={projects}
              creations={creations}
              go={go}
            />
          ))}
        </div>

        {/* Thin line separating tools from the rest */}
        <div className="mx-2 mb-3 border-t border-line" />

        {/* maro Prompts + Çka ke maru — separate from the generation tools */}
        <div className="mb-3 flex flex-col gap-0.5">
          <NavItem
            active={pathname === "/prompts"}
            icon={<Lightbulb className="h-5 w-5" />}
            label="maro Prompts"
            onClick={() => go("/prompts")}
          />
          <NavItem
            active={pathname === "/krijimet"}
            icon={<History className="h-5 w-5" />}
            label="Çka ke maru"
            onClick={() => go("/krijimet")}
          />
        </div>
      </div>

      {/* Footer: account / settings */}
      <div className="border-t border-line p-3">
        {user ? (
          <AnimatePresence mode="wait" initial={false}>
            {settingsOpen ? (
              <SettingsPanel
                key="settings"
                onClose={() => setSettingsOpen(false)}
                onGo={go}
                isAdmin={isAdmin}
                isCreator={isCreator}
                signOut={signOut}
              />
            ) : (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => go("/credits")}
                    className="flex min-w-0 flex-1 items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] transition-colors hover:bg-line"
                  >
                    <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                      <Coins className="h-4 w-4 text-brand" /> {credits}
                    </span>
                    <span className="text-ink-3">kredite</span>
                  </button>
                  <button
                    onClick={() => go("/credits")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg transition-colors hover:bg-brand-hover"
                    title="Shto kredite"
                    aria-label="Shto kredite"
                  >
                    <Wallet className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2"
                >
                  <Avatar user={user} className="h-9 w-9 text-[13px]" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{user.name}</span>
                    <span className="block truncate text-[12px] text-ink-3">{user.email}</span>
                  </span>
                  <Settings className="h-4 w-4 shrink-0 text-ink-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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

// Avatar: uploaded image if present, otherwise initials on a colored disc.
function Avatar({
  user,
  className,
}: {
  user: { name: string; avatarColor: string; avatarUrl?: string };
  className?: string;
}) {
  if (user.avatarUrl) {
    return (
      <span className={cn("block shrink-0 overflow-hidden rounded-full", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white", className)}
      style={{ background: user.avatarColor }}
    >
      {initials(user.name)}
    </span>
  );
}

const THEMES: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "light", label: "Lehtë", icon: Sun },
  { id: "dark", label: "Ngjyra", icon: Palette },
  { id: "mono", label: "Terr", icon: Moon },
];

function SettingsPanel({
  onClose,
  onGo,
  isAdmin,
  isCreator,
  signOut,
}: {
  onClose: () => void;
  onGo: (href: string) => void;
  isAdmin: boolean;
  isCreator: boolean;
  signOut: () => Promise<void>;
}) {
  const { user, updateAvatar } = useMaro();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Zgjidh një imazh.");
    if (file.size > 6 * 1024 * 1024) return toast("Imazhi është shumë i madh (max 6MB).");
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveCrop = async (dataUrl: string) => {
    setUploading(true);
    const { error } = await updateAvatar(dataUrl);
    setUploading(false);
    setCropSrc(null);
    toast(error ? "Gabim gjatë ngarkimit." : "Fotoja u ndryshua.");
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink">Cilësimet</span>
        <button
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Mbyll"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="group relative"
          title="Ndrysho foton"
        >
          <Avatar user={user} className="h-12 w-12 text-[15px]" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-ink/45 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
            ) : (
              <Camera className="h-4 w-4 text-white" />
            )}
          </span>
        </button>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-ink">{user.name}</div>
          <div className="truncate text-[12px] text-ink-3">{user.email}</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* Theme switch */}
      <div>
        <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
          Pamja
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11.5px] font-semibold transition-colors",
                theme === t.id
                  ? "border-brand bg-brand-soft text-ink"
                  : "border-line-strong text-ink-2 hover:bg-surface-2"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-0.5">
        <SettingsRow icon={<Star className="h-4 w-4" />} label="Të preferuarat" onClick={() => onGo("/favourites")} />
        <SettingsRow icon={<UserIcon className="h-4 w-4" />} label="Llogaria" onClick={() => onGo("/account")} />
        {isCreator && (
          <SettingsRow icon={<Star className="h-4 w-4" />} label="maro Kreator" onClick={() => onGo("/kreator")} />
        )}
        {isAdmin && (
          <SettingsRow icon={<Shield className="h-4 w-4" />} label="Admin" onClick={() => onGo("/admin")} />
        )}
        <SettingsRow
          icon={<LogOut className="h-4 w-4" />}
          label="Dil"
          danger
          onClick={async () => {
            await signOut();
            onGo("/");
          }}
        />
      </div>

      <AvatarCropper
        src={cropSrc}
        open={cropSrc !== null}
        saving={uploading}
        onCancel={() => setCropSrc(null)}
        onConfirm={saveCrop}
      />
    </motion.div>
  );
}

function SettingsRow({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors hover:bg-surface-2",
        danger ? "text-danger" : "text-ink-2 hover:text-ink"
      )}
    >
      <span className="shrink-0 text-ink-3">{icon}</span>
      {label}
    </button>
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
  thumb?: React.ReactNode;
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
        {thumb && (
          <span className="relative shrink-0">
            {thumb}
            {favourite && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-surface text-brand shadow-sm">
                <Star className="h-2.5 w-2.5 fill-brand" />
              </span>
            )}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {!thumb && favourite && <Star className="h-3 w-3 shrink-0 fill-brand text-brand" />}
            <span className="truncate text-[14px] font-medium text-ink">{title}</span>
          </span>
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

// A tool row that, when active, expands to reveal its 3 most recent items
// plus a "Shiko të gjitha" link into the Çka ke maru page.
function ToolNav({
  tool,
  active,
  projects,
  creations,
  go,
}: {
  tool: (typeof MAIN_TOOLS)[number];
  active: boolean;
  projects: Project[];
  creations: ImageCreation[];
  go: (href: string) => void;
}) {
  const recentProjects =
    tool.kind === "website"
      ? [...projects].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 3)
      : [];
  const recentCreations =
    tool.kind === "image"
      ? creations
          .filter((c) => c.toolId === tool.id)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          .slice(0, 3)
      : [];
  const hasRecent = recentProjects.length > 0 || recentCreations.length > 0;
  const canExpand = tool.functional && (tool.kind === "website" || tool.kind === "image");

  return (
    <div>
      <button
        onClick={() => go(tool.route)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
          active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
        )}
      >
        <span className={cn("shrink-0", active ? "text-brand" : "text-ink-3")}>
          <tool.icon className="h-5 w-5" />
        </span>
        <span className="flex-1 truncate">{tool.name}</span>
        {active && canExpand && (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {active && canExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-line pl-2">
              {!hasRecent && (
                <div className="px-2 py-2 text-[12.5px] text-ink-3">
                  Ende s&apos;ke krijime këtu.
                </div>
              )}
              {recentProjects.map((p) => (
                <SidebarProjectRow
                  key={p.id}
                  project={p}
                  onOpen={() => go(projectHref(p.status, p.id))}
                />
              ))}
              {recentCreations.map((c) => (
                <SidebarCreationRow
                  key={c.id}
                  creation={c}
                  onOpen={() => go(`${tool.route}?open=${c.id}`)}
                />
              ))}
              {hasRecent && (
                <button
                  onClick={() => go(`/krijimet?tool=${tool.id}`)}
                  className="mt-0.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] font-semibold text-brand transition-colors hover:bg-surface-2"
                >
                  Shiko të gjitha
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
