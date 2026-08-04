"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarCropper } from "@/components/app/AvatarCropper";
import { MaroIcon } from "@/components/app/OptionIcon";
import { useMaro } from "@/context/store";
import { useTheme, type Theme } from "@/context/theme";
import { useToast } from "@/components/ui/Toast";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";
import { Camera, Moon, Star, Sun, User as UserIcon } from "lucide-react";

const THEMES: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "qelt", label: "Qelt", icon: Sun },
  { id: "mshelt", label: "Mshelt", icon: Moon },
];

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

export function AppUserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { user, isAdmin, isCreator, credits, signOut, updateAvatar } = useMaro();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
    setOpen(false);
  };

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

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

  if (!user) {
    return (
      <Link
        href="/sign-in"
        onClick={onNavigate}
        className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-xl bg-surface px-4 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
      >
        Hyr
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-11 w-11 min-w-[44px] place-items-center rounded-full transition-opacity hover:opacity-90"
        aria-label="Llogaria"
      >
        <Avatar user={user} className="h-9 w-9 text-[13px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+8px)] z-[90] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-lg"
          >
            <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
              <button type="button" onClick={() => go("/credits")} className="flex min-w-0 flex-1 items-center gap-2">
                <MaroIcon name="coins" className="h-4 w-4" />
                <span className="text-[14px] font-bold text-ink">{credits}</span>
                <span className="text-[12px] text-ink-3">kredite</span>
              </button>
              <button
                type="button"
                onClick={() => go("/credits")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-teal text-generate-fg"
                aria-label="Shto kredite"
              >
                <MaroIcon name="wallet" className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2.5 px-2 py-1.5">
              <button type="button" onClick={() => fileRef.current?.click()} className="group relative">
                <Avatar user={user} className="h-10 w-10 text-[13px]" />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-dim opacity-0 transition-opacity group-hover:opacity-100">
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
            </div>

            <div className="mt-2 px-1">
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-3">Pamja</div>
              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12px] font-semibold",
                      theme === t.id ? "bg-brand text-brand-fg" : "bg-surface-2 text-ink-2 hover:bg-line"
                    )}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-0.5 px-1">
              <MenuRow icon="user" fallback={UserIcon} label="Llogaria" onClick={() => go("/account")} />
              <MenuRow icon="save" fallback={Star} label="Të preferuarat" onClick={() => go("/favourites")} />
              {isCreator && (
                <MenuRow icon="creator" fallback={Star} label="maro Kreator" onClick={() => go("/kreator")} />
              )}
              {isAdmin && (
                <MenuRow icon="admin" fallback={UserIcon} label="Admin" onClick={() => go("/admin")} />
              )}
              <MenuRow icon="settings" fallback={UserIcon} label="Cilësimet" onClick={() => go("/account")} />
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                go("/");
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-[14px] font-semibold text-danger transition-colors hover:bg-danger/15"
            >
              <MaroIcon name="logout" className="h-4 w-4" />
              Dil
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

      <AvatarCropper
        src={cropSrc}
        open={cropSrc !== null}
        saving={uploading}
        onCancel={() => setCropSrc(null)}
        onConfirm={saveCrop}
      />
    </div>
  );
}

function MenuRow({
  icon,
  fallback: Fallback,
  label,
  onClick,
}: {
  icon: "user" | "save" | "creator" | "admin" | "settings";
  fallback: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <MaroIcon name={icon} fallback={Fallback} className="h-4 w-4" />
      {label}
    </button>
  );
}
