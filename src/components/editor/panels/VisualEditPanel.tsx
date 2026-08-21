"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { PanelSection, PanelLabel } from "./PanelKit";
import { useToast } from "@/components/ui/Toast";
import { projectAssetErrorMessage, uploadProjectAsset } from "@/lib/services/projectAssetService";
import { ImageIcon, Link2, Loader2, MousePointer2, Type, Upload } from "lucide-react";

const inputClass =
  "w-full rounded-lg bg-surface px-3 py-2 text-[12.5px] text-ink outline-none ring-1 ring-line transition focus:ring-2 focus:ring-brand/30";

export function VisualEditPanel() {
  const { htmlSelection, updateHtmlElement, addAssets } = useEditor();
  const { toast } = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  if (!htmlSelection) {
    return (
      <PanelSection>
        <div className="flex flex-col items-center px-2 py-10 text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-brand">
            <MousePointer2 className="h-5 w-5" />
          </span>
          <div className="text-[13.5px] font-semibold text-ink">Zgjidh diçka në website</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
            Kliko një tekst, buton, link ose imazh në preview për ta ndryshuar këtu.
          </p>
        </div>
      </PanelSection>
    );
  }

  const patch = (value: Parameters<typeof updateHtmlElement>[1]) =>
    updateHtmlElement(htmlSelection, value);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadProjectAsset(file);
      addAssets([url], "other");
      patch({ src: url });
      toast("Imazhi u zëvendësua.");
    } catch (error) {
      toast(projectAssetErrorMessage(error));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const icon =
    htmlSelection.kind === "image" ? <ImageIcon className="h-4 w-4" /> :
    htmlSelection.kind === "link" ? <Link2 className="h-4 w-4" /> :
    <Type className="h-4 w-4" />;

  return (
    <div>
      <PanelSection>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-brand">{icon}</span>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-ink">
              {htmlSelection.kind === "image" ? "Imazh" : htmlSelection.kind === "link" ? "CTA / Link" : "Tekst"}
            </div>
            <div className="font-mono text-[10.5px] uppercase text-ink-3">&lt;{htmlSelection.tagName}&gt;</div>
          </div>
        </div>
      </PanelSection>

      {htmlSelection.kind !== "image" && htmlSelection.kind !== "field" && (
        <PanelSection>
          <PanelLabel>Teksti</PanelLabel>
          <textarea
            value={htmlSelection.text}
            onChange={(event) => patch({ text: event.target.value })}
            rows={4}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </PanelSection>
      )}

      {htmlSelection.kind === "field" && (
        <PanelSection>
          <PanelLabel>Vlera</PanelLabel>
          <input
            value={htmlSelection.value ?? ""}
            onChange={(event) => patch({ value: event.target.value })}
            className={inputClass}
          />
          <div className="mt-3">
          <PanelLabel>Placeholder</PanelLabel>
          <input
            value={htmlSelection.placeholder ?? ""}
            onChange={(event) => patch({ placeholder: event.target.value })}
            className={inputClass}
          />
          </div>
        </PanelSection>
      )}

      {htmlSelection.kind === "link" && (
        <PanelSection>
          <PanelLabel>Linku</PanelLabel>
          <input
            value={htmlSelection.href ?? ""}
            onChange={(event) => patch({ href: event.target.value })}
            placeholder="https://... ose /kontakt"
            className={inputClass}
          />
        </PanelSection>
      )}

      {htmlSelection.kind === "image" && (
        <>
          <PanelSection>
            {htmlSelection.src && (
              <img src={htmlSelection.src} alt="" className="mb-3 aspect-video w-full rounded-lg object-cover" />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Duke ngarkuar…" : "Zëvendëso imazhin"}
            </button>
            <p className="mt-2 text-[10.5px] text-ink-3">PNG, JPG ose WebP · maksimumi 5 MB</p>
          </PanelSection>
          <PanelSection>
            <PanelLabel>URL e imazhit</PanelLabel>
            <input
              value={htmlSelection.src ?? ""}
              onChange={(event) => patch({ src: event.target.value })}
              className={inputClass}
            />
            <div className="mt-3">
              <PanelLabel>Alt text</PanelLabel>
              <input
                value={htmlSelection.alt ?? ""}
                onChange={(event) => patch({ alt: event.target.value })}
                className={inputClass}
              />
            </div>
          </PanelSection>
        </>
      )}
    </div>
  );
}
