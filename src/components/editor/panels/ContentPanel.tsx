"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { UploadArea } from "@/components/ui/UploadArea";
import { PanelSection, PanelLabel, SegRow } from "./PanelKit";
import { EmptyState } from "@/components/ui/Misc";
import { MousePointerClick, Type, Square, ImageIcon } from "lucide-react";
import type { ButtonStyle } from "@/lib/types";

const KIND_META = {
  text: { icon: Type, label: "Tekst" },
  button: { icon: Square, label: "Buton" },
  image: { icon: ImageIcon, label: "Imazh" },
};

export function ContentPanel() {
  const { project, selection, updateSectionField, updateTheme, addAssets } = useEditor();

  if (!selection) {
    return (
      <PanelSection>
        <EmptyState
          className="border-none bg-transparent py-10"
          icon={<MousePointerClick />}
          title="Zgjidh një element"
          description="Kliko mbi tekst, buton ose imazh në website për ta redaktuar këtu."
        />
      </PanelSection>
    );
  }

  const Meta = KIND_META[selection.kind];
  const current = (() => {
    for (const pg of project.pages) {
      const sec = pg.sections.find((s) => s.id === selection.sectionId);
      if (sec) return String(sec.data[selection.field] ?? "");
    }
    return selection.value;
  })();

  return (
    <div>
      <PanelSection>
        <div className="flex items-center gap-2.5 rounded-xl bg-brand-soft px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <Meta.icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand/70">Element</div>
            <div className="text-[13.5px] font-bold text-ink">{selection.label}</div>
          </div>
        </div>
      </PanelSection>

      {selection.kind === "text" && (
        <PanelSection title="Përmbajtja">
          <Textarea
            autoFocus
            rows={selection.field === "body" || selection.field === "quote" ? 6 : 3}
            value={current}
            onChange={(e) => updateSectionField(selection.sectionId, selection.field, e.target.value)}
          />
        </PanelSection>
      )}

      {selection.kind === "button" && (
        <>
          <PanelSection title="Butoni">
            <PanelLabel>Teksti</PanelLabel>
            <Input value={current} onChange={(e) => updateSectionField(selection.sectionId, selection.field, e.target.value)} />
            <div className="mt-3">
              <PanelLabel>URL</PanelLabel>
              <Input placeholder="https://..." defaultValue="#" />
            </div>
          </PanelSection>
          <PanelSection title="Stili">
            <SegRow<ButtonStyle>
              value={project.theme.buttonStyle}
              onChange={(v) => updateTheme({ buttonStyle: v })}
              options={[
                { value: "solid", label: "Solid" },
                { value: "outline", label: "Outline" },
                { value: "soft", label: "Soft" },
                { value: "pill", label: "Pill" },
              ]}
            />
          </PanelSection>
        </>
      )}

      {selection.kind === "image" && (
        <>
          <PanelSection title="Imazhi aktual">
            <div className="overflow-hidden rounded-xl border border-line">
              <img src={current} alt="" className="h-32 w-full object-cover" />
            </div>
          </PanelSection>
          <PanelSection title="Zëvendëso nga assets">
            <div className="grid grid-cols-3 gap-2">
              {project.assets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => updateSectionField(selection.sectionId, selection.field, a.url)}
                  className={`overflow-hidden rounded-lg border-2 transition-all ${
                    a.url === current ? "border-brand" : "border-line hover:border-brand/40"
                  }`}
                >
                  <img src={a.url} alt={a.name} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-3">
              <UploadArea
                compact
                multiple={false}
                label="Ngarko imazh të ri"
                hint="Përdoret menjëherë"
                onFiles={(urls) => {
                  addAssets(urls, "other");
                  updateSectionField(selection.sectionId, selection.field, urls[0]);
                }}
              />
            </div>
          </PanelSection>
          <PanelSection title="Cilësimet">
            <PanelLabel>Alt text</PanelLabel>
            <Input placeholder="Përshkrimi i imazhit" defaultValue="" />
            <div className="mt-3">
              <PanelLabel>Pozicioni</PanelLabel>
              <Select defaultValue="cover">
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="center">Center</option>
              </Select>
            </div>
          </PanelSection>
        </>
      )}
    </div>
  );
}
