"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";
import { getAccessToken } from "@/lib/supabase/client";

function avatarForeground(color: string) {
  const hex = color.replace(/^#/, "");
  const expanded = hex.length === 3 ? [...hex].map(value => value + value).join("") : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) return "var(--maro-white)";
  const channels = [0, 2, 4].map(offset => parseInt(expanded.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / (0.003 + 0.05) > 1.05 / (luminance + 0.05)
    ? "var(--maro-ink)" : "var(--maro-white)";
}

export function UserAvatar({ user, className }: {
  user: { name: string; avatarColor?: string; avatarUrl?: string };
  className?: string;
}) {
  return <AvatarImage key={user.avatarUrl ?? "empty"} user={user} className={className} />;
}

function AvatarImage({ user, className }: Parameters<typeof UserAvatar>[0]) {
  const [src, setSrc] = React.useState(user.avatarUrl);
  const [loaded, setLoaded] = React.useState(false);
  const retried = React.useRef(false);
  const active = React.useRef(true);
  React.useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const recover = async () => {
    setLoaded(false);
    setSrc(undefined);
    if (retried.current) return;
    retried.current = true;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch("/api/avatar", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (active.current && typeof data.url === "string" && data.url !== user.avatarUrl) setSrc(data.url);
    } catch { /* Initials remain visible when recovery is unavailable. */ }
  };
  const background = user.avatarColor ?? "#253FDA";
  return <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold", className)}
    style={{ background, color: avatarForeground(background) }}>
    <span aria-hidden="true">{initials(user.name)}</span>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {src && <img src={src} alt="" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => void recover()}
      className={cn("absolute inset-0 h-full w-full object-cover", !loaded && "opacity-0")} />}
  </span>;
}
