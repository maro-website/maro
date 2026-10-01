"use client";

import * as React from "react";
import { X } from "lucide-react";
import { UploadArea } from "@/components/ui/UploadArea";
import { MAX_REFERENCE_BYTES, MAX_REFERENCE_IMAGES } from "@/lib/marologo/constants";
import type { UploadedReference } from "@/lib/marologo/types";
import { uid } from "@/lib/utils/format";

export function ReferenceUpload({
  references,
  onChange,
  onError,
}: {
  references: UploadedReference[];
  onChange: (refs: UploadedReference[]) => void;
  onError?: (msg: string) => void;
}) {
  const addFiles = async (dataUrls: string[], files?: File[]) => {
    const remaining = MAX_REFERENCE_IMAGES - references.length;
    if (remaining <= 0) {
      onError?.(`Maksimumi është ${MAX_REFERENCE_IMAGES} referenca.`);
      return;
    }

    const toAdd: UploadedReference[] = [];
    for (let i = 0; i < Math.min(dataUrls.length, remaining); i++) {
      const url = dataUrls[i];
      if (!url.startsWith("data:image/")) {
        onError?.("Vetëm imazhe PNG, JPG ose WEBP.");
        continue;
      }
      const name = files?.[i]?.name ?? `reference_${i + 1}.jpg`;
      toAdd.push({ id: uid("ref"), name, dataUrl: url });
    }
    if (toAdd.length) onChange([...references, ...toAdd]);
  };

  const handleFilesFromInput = async (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, MAX_REFERENCE_IMAGES - references.length);
    for (const f of files) {
      if (f.size > MAX_REFERENCE_BYTES) {
        onError?.("Imazhi është shumë i madh (max 8MB).");
        return;
      }
    }
    const urls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("read failed"));
            reader.readAsDataURL(file);
          })
      )
    );
    await addFiles(urls, files);
  };

  return (
    <div className="space-y-[20px]">
      <h3 className="text-[15px] font-semibold text-ink">Referenca</h3>
      {references.length < MAX_REFERENCE_IMAGES && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) void handleFilesFromInput(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <UploadArea
            label="Drag & Drop ose kliko këtu"
            hint=""
            onFiles={(urls) => void addFiles(urls)}
            inline
            className="marologo-card bg-surface"
          />
        </div>
      )}
      {references.length > 0 && (
        <ul className="space-y-[10px]">
          {references.map((ref) => (
            <li key={ref.id} className="flex items-center gap-[20px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ref.dataUrl} alt="" className="h-[64px] w-[64px] shrink-0 rounded-maro16 object-cover" />
              <div className="marologo-card flex h-[64px] min-w-0 flex-1 items-center gap-[20px] px-[20px]">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{ref.name}</span>
                <button
                  type="button"
                  aria-label={`Hiq ${ref.name}`}
                  onClick={() => onChange(references.filter((r) => r.id !== ref.id))}
                  className="rounded-lg p-[10px] text-[var(--maro-gray-300)] hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
