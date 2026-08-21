"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { PanelSection, PanelLabel } from "./PanelKit";
import { useToast } from "@/components/ui/Toast";
import { projectAssetErrorMessage, uploadProjectAsset } from "@/lib/services/projectAssetService";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BoxSelect,
  ImageIcon,
  Link2,
  Loader2,
  MousePointer2,
  Palette,
  Type,
  Upload,
} from "lucide-react";

const inputClass =
  "w-full rounded-lg bg-surface px-3 py-2 text-[12.5px] text-ink outline-none ring-1 ring-line transition focus:ring-2 focus:ring-brand/30";

function pickerColor(value: string, fallback: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const parts = value.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  if (!parts) return fallback;
  return `#${[parts[1], parts[2], parts[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}

function numericCss(value: string): string {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? String(Math.round(parsed * 100) / 100) : "";
}

function ColorControl({
  value,
  fallback,
  onChange,
}: {
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/30">
      <input
        type="color"
        value={pickerColor(value, fallback)}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-ink outline-none"
      />
    </div>
  );
}

function NumberControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
      <div className="flex items-center rounded-lg bg-surface px-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/30">
        <input
          type="number"
          step="0.5"
          value={numericCss(value)}
          onChange={(event) => onChange(event.target.value ? `${event.target.value}px` : "")}
          className="min-w-0 flex-1 bg-transparent py-2 text-[12px] text-ink outline-none"
        />
        <span className="text-[10px] text-ink-3">px</span>
      </div>
    </label>
  );
}

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
  const patchStyle = (name: keyof typeof htmlSelection.styles, value: string) =>
    patch({ styles: { [name]: value } });

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

      <PanelSection>
        <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <Palette className="h-4 w-4 text-brand" /> Pamja
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <PanelLabel>Teksti</PanelLabel>
            <ColorControl
              value={htmlSelection.styles.color}
              fallback="#111111"
              onChange={(value) => patchStyle("color", value)}
            />
          </div>
          <div>
            <PanelLabel>Sfondi</PanelLabel>
            <ColorControl
              value={htmlSelection.styles.backgroundColor}
              fallback="#ffffff"
              onChange={(value) => patchStyle("backgroundColor", value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <PanelLabel>Opacity</PanelLabel>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={Number.parseFloat(htmlSelection.styles.opacity) || 0}
              onChange={(event) => patchStyle("opacity", event.target.value)}
              className="min-w-0 flex-1 accent-brand"
            />
            <span className="w-10 text-right text-[11.5px] text-ink-2">
              {Math.round((Number.parseFloat(htmlSelection.styles.opacity) || 0) * 100)}%
            </span>
          </div>
        </div>
      </PanelSection>

      {htmlSelection.kind !== "image" && (
        <PanelSection>
          <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
            <Type className="h-4 w-4 text-brand" /> Tipografia
          </div>
          <PanelLabel>Fonti</PanelLabel>
          <input
            list="maro-editor-fonts"
            value={htmlSelection.styles.fontFamily}
            onChange={(event) => patchStyle("fontFamily", event.target.value)}
            className={inputClass}
          />
          <datalist id="maro-editor-fonts">
            <option value="Inter, sans-serif" />
            <option value="Manrope, sans-serif" />
            <option value="DM Sans, sans-serif" />
            <option value="Space Grotesk, sans-serif" />
            <option value="Playfair Display, serif" />
            <option value="Georgia, serif" />
          </datalist>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NumberControl label="Madhësia" value={htmlSelection.styles.fontSize} onChange={(v) => patchStyle("fontSize", v)} />
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-3">Pesha</span>
              <select
                value={htmlSelection.styles.fontWeight}
                onChange={(event) => patchStyle("fontWeight", event.target.value)}
                className={inputClass}
              >
                {[300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
              </select>
            </label>
            <NumberControl label="Line height" value={htmlSelection.styles.lineHeight} onChange={(v) => patchStyle("lineHeight", v)} />
            <NumberControl label="Hapësira" value={htmlSelection.styles.letterSpacing} onChange={(v) => patchStyle("letterSpacing", v)} />
          </div>
          <div className="mt-3">
            <PanelLabel>Rreshtimi</PanelLabel>
            <div className="grid grid-cols-3 rounded-lg bg-surface p-1 ring-1 ring-line">
              {[
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
              ].map(([align, Icon]) => (
                <button
                  key={align as string}
                  type="button"
                  onClick={() => patchStyle("textAlign", align as string)}
                  className={`grid h-8 place-items-center rounded-md ${htmlSelection.styles.textAlign === align ? "bg-surface-2 text-brand" : "text-ink-3 hover:text-ink"}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </PanelSection>
      )}

      <PanelSection>
        <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <BoxSelect className="h-4 w-4 text-brand" /> Layout
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberControl label="Gjerësia" value={htmlSelection.styles.width} onChange={(v) => patchStyle("width", v)} />
          <NumberControl label="Lartësia" value={htmlSelection.styles.height} onChange={(v) => patchStyle("height", v)} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <NumberControl label="Top" value={htmlSelection.styles.paddingTop} onChange={(v) => patchStyle("paddingTop", v)} />
          <NumberControl label="Right" value={htmlSelection.styles.paddingRight} onChange={(v) => patchStyle("paddingRight", v)} />
          <NumberControl label="Bottom" value={htmlSelection.styles.paddingBottom} onChange={(v) => patchStyle("paddingBottom", v)} />
          <NumberControl label="Left" value={htmlSelection.styles.paddingLeft} onChange={(v) => patchStyle("paddingLeft", v)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberControl label="Radius" value={htmlSelection.styles.borderRadius} onChange={(v) => patchStyle("borderRadius", v)} />
          {htmlSelection.kind === "image" && (
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-3">Imazhi</span>
              <select
                value={htmlSelection.styles.objectFit}
                onChange={(event) => patchStyle("objectFit", event.target.value)}
                className={inputClass}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
                <option value="none">Origjinal</option>
              </select>
            </label>
          )}
        </div>
      </PanelSection>
    </div>
  );
}
