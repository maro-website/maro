"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { ColorInput } from "@/components/ui/Misc";
import { Select } from "@/components/ui/Input";
import { PanelSection, PanelLabel, SegRow } from "./PanelKit";
import { FONT_OPTIONS } from "@/components/website-previews/theme";
import type { ButtonStyle, FontKey } from "@/lib/types";

export function DesignPanel() {
  const { project, updateTheme } = useEditor();
  const t = project.theme;

  return (
    <div>
      <PanelSection title="Ngjyrat">
        <div className="grid grid-cols-2 gap-2">
          <ColorInput label="Kryesore" value={t.primaryColor} onChange={(v) => updateTheme({ primaryColor: v })} />
          <ColorInput label="Dytësore" value={t.secondaryColor} onChange={(v) => updateTheme({ secondaryColor: v })} />
          <ColorInput label="Sfondi" value={t.backgroundColor} onChange={(v) => updateTheme({ backgroundColor: v })} />
          <ColorInput label="Teksti" value={t.textColor} onChange={(v) => updateTheme({ textColor: v })} />
        </div>
      </PanelSection>

      <PanelSection title="Tipografia">
        <div className="space-y-3">
          <div>
            <PanelLabel>Fonti i titujve</PanelLabel>
            <Select value={t.headingFont} onChange={(e) => updateTheme({ headingFont: e.target.value as FontKey })}>
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
          <div>
            <PanelLabel>Fonti i tekstit</PanelLabel>
            <Select value={t.bodyFont} onChange={(e) => updateTheme({ bodyFont: e.target.value as FontKey })}>
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Forma">
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <PanelLabel>Border radius</PanelLabel>
              <span className="text-[12px] font-semibold text-ink-3">{t.radius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={28}
              value={t.radius}
              onChange={(e) => updateTheme({ radius: Number(e.target.value) })}
              className="w-full accent-brand"
            />
          </div>
          <div>
            <PanelLabel>Stili i butonave</PanelLabel>
            <SegRow<ButtonStyle>
              value={t.buttonStyle}
              onChange={(v) => updateTheme({ buttonStyle: v })}
              options={[
                { value: "solid", label: "Solid" },
                { value: "outline", label: "Outline" },
                { value: "soft", label: "Soft" },
                { value: "pill", label: "Pill" },
              ]}
            />
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
