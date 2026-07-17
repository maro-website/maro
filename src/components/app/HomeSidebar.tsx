"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import { TOOLS, getTool } from "@/lib/tools/registry";
import { initials, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  Plus,
  Coins,
  Shield,
  LogOut,
  User as UserIcon,
  LayoutGrid,
  Image as ImageIcon,
  Home,
  X,
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
          <Badge tone="brand" className="text-[10px]">Beta</Badge>
        </Link>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 lg:hidden"
            aria-label="Mbyll"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-3 pt-5">
        <button
          onClick={() => go("/")}
          className="flex w-full items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-[13.5px] font-semibold text-brand-fg shadow-brand/30 transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" /> Krijim i ri
        </button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto scroll-thin px-3">
        {/* Tools */}
        <SectionLabel icon={<LayoutGrid className="h-3.5 w-3.5" />}>Tools</SectionLabel>
        <div className="mb-4 flex flex-col gap-0.5">
          <NavItem
            active={pathname === "/"}
            icon={<Home className="h-4 w-4" />}
            label="Hub"
            onClick={() => go("/")}
          />
          {TOOLS.map((t) => (
            <NavItem
              key={t.id}
              active={pathname === t.route}
              icon={<t.icon className="h-4 w-4" />}
              label={t.name}
              accent={t.accent}
              onClick={() => go(t.route)}
            />
          ))}
        </div>

        {/* Website projects */}
        {projects.length > 0 && (
          <>
            <SectionLabel icon={<LayoutGrid className="h-3.5 w-3.5" />}>Website-t</SectionLabel>
            <div className="mb-4 flex flex-col gap-0.5">
              {projects.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(projectHref(p.status, p.id))}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-bold text-white"
                    style={{ background: p.theme?.primaryColor ?? "#5a28e5" }}
                  >
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">
                      {p.status === "generating" ? "Po gjenerohet…" : timeAgo(p.updatedAt)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Recent images */}
        {creations.length > 0 && (
          <>
            <SectionLabel icon={<ImageIcon className="h-3.5 w-3.5" />}>Imazhet</SectionLabel>
            <div className="mb-2 flex flex-col gap-0.5">
              {creations.slice(0, 6).map((c) => {
                const tool = getTool(c.toolId);
                return (
                  <button
                    key={c.id}
                    onClick={() => go(tool?.route ?? "/")}
                    className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
                      {c.urls[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.urls[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {c.prompt || tool?.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-3">
                        {tool?.name} · {timeAgo(c.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {projects.length === 0 && creations.length === 0 && (
          <div className="px-2 py-2 text-[13px] leading-relaxed text-ink-3">
            Ende s&apos;ke krijime. Zgjidh një tool lart dhe fillo.
          </div>
        )}
      </div>

      {/* Footer: account */}
      <div className="border-t border-line p-3">
        {user ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <Coins className="h-3.5 w-3.5 text-brand" /> {credits}
              </span>
              <span className="text-ink-3">kredite</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => go("/account")}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
                  style={{ background: user.avatarColor }}
                >
                  {initials(user.name)}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13px] font-semibold text-ink">{user.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{user.email}</span>
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
              "flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
            )}
          >
            <UserIcon className="h-4 w-4" /> Hyr / Regjistrohu
          </button>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">
      {icon} {children}
    </div>
  );
}

function NavItem({
  active,
  icon,
  label,
  accent,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      )}
    >
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
        style={accent ? { color: accent, background: `${accent}14` } : { color: "var(--ink-3)" }}
      >
        {icon}
      </span>
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
            className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-canvas"
          >
            <HomeSidebar onNavigate={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
