"use client";

import * as React from "react";
import { Field } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Misc";
import type { ToolOptionIconSet, ToolOptionIcons } from "@/lib/tools/optionIcons";
import { staticOptionIconSrc } from "@/lib/tools/iconMap";

async function readSvgDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

export function OptionIconFields({
  optionKey,
  icons,
  onChange,
  getAccessToken,
  toast,
}: {
  optionKey: string;
  icons: ToolOptionIcons;
  onChange: (next: ToolOptionIcons) => void;
  getAccessToken: () => Promise<string | null>;
  toast: (msg: string) => void;
}) {
  const [busy, setBusy] = React.useState<"light" | "dark" | null>(null);
  const set = icons[optionKey] ?? {};

  const upload = async (variant: "light" | "dark", file: File) => {
    if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
      toast("Vetëm SVG lejohet.");
      return;
    }
    setBusy(variant);
    try {
      const dataUrl = await readSvgDataUrl(file);
      const token = await getAccessToken();
      const res = await fetch("/api/admin/icon-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dataUrl, key: optionKey, variant }),
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !j.url) {
        toast("Ngarkimi dështoi: " + (j.error ?? res.status));
        return;
      }
      onChange({
        ...icons,
        [optionKey]: { ...set, [variant]: j.url },
      });
      toast("Ikona u ngarkua.");
    } finally {
      setBusy(null);
    }
  };

  const clear = (variant: "light" | "dark") => {
    const nextSet = { ...set };
    delete nextSet[variant];
    const next = { ...icons };
    if (!nextSet.light && !nextSet.dark) delete next[optionKey];
    else next[optionKey] = nextSet;
    onChange(next);
  };

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {(
        [
          { variant: "light" as const, label: "Ikona SVG — Qelt (light)" },
          { variant: "dark" as const, label: "Ikona SVG — Mshelt (dark)" },
        ] as const
      ).map(({ variant, label }) => (
        <Field key={variant} label={label}>
          <div className="flex items-center gap-2">
            {set[variant] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={set[variant]}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg bg-surface-2 object-contain p-1"
              />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-[10px] text-ink-3">
                —
              </span>
            )}
            <label className="inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-line">
              {busy === variant ? <Spinner className="h-4 w-4" /> : "Ngarko SVG"}
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                disabled={busy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void upload(variant, f);
                }}
              />
            </label>
            {set[variant] && (
              <button
                type="button"
                onClick={() => clear(variant)}
                className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                Hiq
              </button>
            )}
          </div>
        </Field>
      ))}
    </div>
  );
}

export function optionIconPreview(
  icons: ToolOptionIcons,
  optionKey: string,
  variant: "light" | "dark" = "dark",
  toolId?: string,
  settingId?: string,
  optionId?: string
): string | undefined {
  const set: ToolOptionIconSet | undefined = icons[optionKey];
  const admin = variant === "dark" ? set?.dark ?? set?.light : set?.light ?? set?.dark;
  if (admin) return admin;
  if (toolId && settingId && optionId) {
    return staticOptionIconSrc(toolId, settingId, optionId);
  }
  return undefined;
}
