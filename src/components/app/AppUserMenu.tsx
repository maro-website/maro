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
import { Camera, Moon, Shield, Star, Sun, User as UserIcon } from "lucide-react";

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
  const { user, isAdmin, isCreator, signOut, updateAvatar } = useMaro();
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
        className="inline-flex h-12 min-w-[48px] items-center justify-center rounded-2xl bg-surface-2 px-5 text-[16px] font-semibold text-ink"
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
        className="grid h-12 w-12 place-items-center rounded-full transition-opacity hover:opacity-90"
        aria-label="Llogaria"
      >
        <Avatar user={user} className="h-11 w-11 text-[15px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+10px)] z-[90] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface-2 p-3 shadow-xl"
          >
            <div className="flex items-center gap-3 px-1 py-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="group relative">
                <Avatar user={user} className="h-12 w-12 text-[16px]" />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-dim opacity-0 transition-opacity group-hover:opacity-100">
                  {uploading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </span>
              </button>
              <div className="min-w-0">
                <div className="truncate text-[16px] font-bold text-ink">{user.name}</div>
                <div className="truncate text-[13px] text-ink-3">{user.email}</div>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <MenuRow icon="user" fallback={UserIcon} label="Llogaria" onClick={() => go("/account")} />
              {isAdmin && (
                <MenuRow icon="admin" fallback={Shield} label="Admin Panel" onClick={() => go("/admin")} />
              )}
              <MenuRow icon="settings" fallback={UserIcon} label="Cilësimet" onClick={() => go("/account")} />
              <MenuRow icon="save" fallback={Star} label="T'trujtuna" onClick={() => go("/favourites")} />
              {isCreator && (
                <MenuRow icon="creator" fallback={Star} label="maro Kreator" onClick={() => go("/kreator")} />
              )}
            </div>

            <div className="mt-3 px-1">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">Pamja</div>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold",
                      theme === t.id ? "bg-accent-teal text-generate-fg" : "bg-surface text-ink-2 hover:bg-line"
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                go("/");
              }}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff0000] text-[16px] font-bold text-white transition-opacity hover:opacity-90"
            >
              <MaroIcon name="logout" className="h-5 w-5" />
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
      className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[16px] font-medium text-ink transition-colors hover:bg-surface"
    >
      <MaroIcon name={icon} fallback={Fallback} className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );
}
