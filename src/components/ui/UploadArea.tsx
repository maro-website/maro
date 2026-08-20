"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function readFilesAsDataUrls(files: FileList | File[]): Promise<string[]> {
  const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
  return Promise.all(
    arr.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        })
    )
  );
}

export function UploadArea({
  onFiles,
  label = "Zvarrit imazhet këtu",
  hint = "ose kliko për të zgjedhur · PNG, JPG, SVG",
  multiple = true,
  className,
  compact = false,
}: {
  onFiles: (dataUrls: string[]) => void;
  label?: string;
  hint?: string;
  multiple?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handle = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const urls = await readFilesAsDataUrls(files);
    if (urls.length) onFiles(urls);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-2xl text-center transition-all",
        compact ? "gap-1.5 p-5" : "gap-2 p-8",
        dragging ? "bg-brand text-brand-fg" : "bg-surface-2 hover:bg-surface-hover",
        className
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-2xl bg-surface text-ink transition-transform group-hover:scale-105",
          compact ? "h-9 w-9" : "h-12 w-12"
        )}
      >
        <UploadCloud className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>
      <div className={cn("font-semibold", compact ? "text-[13px]" : "text-[14px]")}>
        {label}
      </div>
      <div className={cn("text-[12px]", dragging ? "text-brand-fg/70" : "text-ink-3")}>{hint}</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
