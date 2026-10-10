"use client";

import { useLogoContent } from "../LogoContent";
import * as React from "react";
import { X, UploadCloud, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AttachmentPicker } from "@/components/app/AttachmentPicker";
import { resolvePrivateAssetRefsStrict } from "@/lib/services/projectAssetService";
import { useMaro } from "@/context/store";
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
  const content = useLogoContent();
  const { user } = useMaro();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [reading, setReading] = React.useState(false);
  const readingRef = React.useRef(false);
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  const fileInput = React.useRef<HTMLInputElement>(null);
  const referenceKeys = references.flatMap(ref => ref.storageRef ? [ref.storageRef] : []).join("|");
  React.useEffect(() => {
    if (!user || !referenceKeys) return;
    let alive = true;
    void resolvePrivateAssetRefsStrict(referenceKeys.split("|")).then(urls => { if (alive) setPreviews(urls); }).catch(() => undefined);
    return () => { alive = false; };
  }, [referenceKeys, user]);
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
    if (readingRef.current) return;
    const files = Array.from(fileList).slice(0, MAX_REFERENCE_IMAGES - references.length);
    for (const f of files) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
        onError?.("Zgjedh një imazh PNG, JPG ose WebP.");
        return;
      }
      if (f.size > MAX_REFERENCE_BYTES) {
        onError?.("Imazhi është shumë i madh (max 8MB).");
        return;
      }
    }
    readingRef.current = true;
    setReading(true);
    try {
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
    } catch { onError?.("Imazhi nuk u lexua. Provo përsëri."); }
    finally { readingRef.current = false; setReading(false); }
  };

  return (
    <div className="space-y-[20px]">
      <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold text-ink">{content.references.label}</h3><span className="text-sm tabular-nums text-ink-3">{references.length} / {MAX_REFERENCE_IMAGES}</span></div>
      {references.length < MAX_REFERENCE_IMAGES && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) void handleFilesFromInput(e.dataTransfer.files);
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
        >
          <button type="button" disabled={reading} onClick={() => fileInput.current?.click()} data-dragging={dragging || undefined} className="marologo-upload flex min-h-48 w-full flex-col items-center justify-center gap-3 p-6 text-center transition-colors disabled:opacity-60">
            <span className="grid h-12 w-12 place-items-center rounded-maro16 bg-surface-2"><UploadCloud className="h-6 w-6 text-brand" /></span>
            <span className="text-base font-semibold text-ink">{reading ? "Duke lexuar imazhin…" : content.references.placeholder}</span>
            <span className="text-sm text-ink-3">Kliko ose tërhiq imazhet këtu · PNG, JPG, WebP · deri në 8 MB</span>
          </button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={event => { if (event.target.files) void handleFilesFromInput(event.target.files); event.target.value = ""; }} />
        </div>
      )}
      {user && references.length < MAX_REFERENCE_IMAGES && <Button variant="secondary" icon={<FolderOpen className="h-4 w-4" />} disabled={reading} onClick={() => setPickerOpen(true)}>Zgjedh nga asetet</Button>}
      <AttachmentPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onUpload={() => fileInput.current?.click()} limit={MAX_REFERENCE_IMAGES - references.length} excludeRefs={references.flatMap(ref => ref.storageRef ? [ref.storageRef] : [])} onSelect={assets => onChange([...references, ...assets.map(asset => ({ id: uid("ref"), name: asset.name, storageRef: asset.storageRef, dataUrl: asset.url }))].slice(0, MAX_REFERENCE_IMAGES))} />
      {references.length > 0 && (
        <ul className="space-y-[10px]">
          {references.map((ref) => (
            <li key={ref.id} className="flex items-center gap-[20px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={(ref.storageRef && previews[ref.storageRef]) || ref.dataUrl} alt="" className="h-[64px] w-[64px] shrink-0 rounded-maro16 object-cover" />
              <div className="marologo-card flex h-[64px] min-w-0 flex-1 items-center gap-[20px] px-[20px]">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{ref.name}</span>
                <button
                  type="button"
                  aria-label={`Hiq ${ref.name}`}
                  onClick={() => onChange(references.filter((r) => r.id !== ref.id))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-maro12 text-ink-2 hover:bg-surface-2 hover:text-ink"
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
