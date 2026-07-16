"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { Input, Textarea } from "@/components/ui/Input";
import { PanelSection, PanelLabel } from "./PanelKit";
import { slugify } from "@/lib/utils/format";
import { Globe } from "lucide-react";

export function SeoPanel() {
  const { project, updateSeo } = useEditor();
  const page = project.pages.find((p) => p.id === project.activePageId) ?? project.pages[0];
  const seo = page.seo;

  return (
    <div>
      <PanelSection>
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
          SEO për faqen: <span className="font-semibold text-ink">{page.name}</span>
        </div>
      </PanelSection>

      <PanelSection title="Meta">
        <div className="space-y-3">
          <div>
            <PanelLabel>Page Title</PanelLabel>
            <Input value={seo.title} onChange={(e) => updateSeo(page.id, { title: e.target.value })} />
          </div>
          <div>
            <PanelLabel>Meta Description</PanelLabel>
            <Textarea rows={3} value={seo.description} onChange={(e) => updateSeo(page.id, { description: e.target.value })} placeholder="Përshkrimi që shfaqet në Google..." />
          </div>
          <div>
            <PanelLabel>URL Slug</PanelLabel>
            <div className="flex items-center rounded-xl border border-line-strong bg-surface px-3">
              <span className="text-[13px] text-ink-3">{project.previewUrl}/</span>
              <input
                value={seo.slug}
                onChange={(e) => updateSeo(page.id, { slug: slugify(e.target.value) })}
                className="h-11 flex-1 bg-transparent text-[13px] text-ink outline-none"
              />
            </div>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Pamja në Google">
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-surface-2"><Globe className="h-2.5 w-2.5" /></span>
            {project.previewUrl} › {seo.slug}
          </div>
          <div className="mt-1 text-[15px] font-medium leading-snug text-[#1a0dab]">
            {seo.title || page.name}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">
            {seo.description || "Shto një meta description për ta parë këtu si do të duket në rezultatet e kërkimit."}
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
