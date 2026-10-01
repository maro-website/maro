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
  inline = false,
}: {
  onFiles: (dataUrls: string[]) => void;
  label?: string;
  hint?: string;
  multiple?: boolean;
  className?: string;
  compact?: boolean;
  inline?: boolean;
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
        inline ? "min-h-[178px] flex-row gap-[20px] p-[30px]" : compact ? "gap-1.5 p-5" : "gap-[10px] p-[30px]",
        dragging ? "bg-brand text-brand-fg" : "bg-surface hover:bg-surface-hover",
        className
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-2xl text-ink transition-transform group-hover:scale-105",
          inline ? "h-11 w-11 bg-transparent text-[var(--maro-gray-300)]" : "bg-surface",
          compact ? "h-9 w-9" : !inline && "h-12 w-12"
        )}
      >
        <UploadCloud className={compact ? "h-4 w-4" : inline ? "h-7 w-7" : "h-5 w-5"} />
      </div>
      <div className={cn("font-semibold", inline ? "text-[15px] text-[var(--maro-gray-300)]" : compact ? "text-[13px]" : "text-[14px]")}>
        {label}
      </div>
      {hint && <div className={cn("text-[12px]", dragging ? "text-brand-fg/70" : "text-ink-3")}>{hint}</div>}
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
