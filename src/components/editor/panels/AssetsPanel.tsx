"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { UploadArea } from "@/components/ui/UploadArea";
import { PanelSection } from "./PanelKit";
import { EmptyState } from "@/components/ui/Misc";
import { Dropdown } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils/cn";
import type { AssetCategory } from "@/lib/types";
import { MoreVertical, Trash2, ImageIcon } from "lucide-react";

const CATEGORIES: { key: AssetCategory | "all"; label: string }[] = [
  { key: "all", label: "Të gjitha" },
  { key: "logo", label: "Logo" },
  { key: "brand", label: "Brand" },
  { key: "team", label: "Team" },
  { key: "products", label: "Products" },
  { key: "other", label: "Other" },
];

export function AssetsPanel() {
  const { project, addAssets, deleteAsset } = useEditor();
  const [filter, setFilter] = React.useState<AssetCategory | "all">("all");

  const assets = project.assets.filter((a) => filter === "all" || a.category === filter);

  return (
    <div>
      <PanelSection>
        <UploadArea
          compact
          label="Ngarko asete"
          hint="PNG, JPG · ruhet lokalisht"
          onFiles={(urls) => addAssets(urls, "other")}
        />
      </PanelSection>

      <PanelSection>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                filter === c.key
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-ink-2 hover:bg-surface-2"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection>
        {assets.length === 0 ? (
          <EmptyState
            className="border-none bg-transparent py-8"
            icon={<ImageIcon />}
            title="Asnjë aset"
            description="Ngarko imazhe për t'i përdorur në website."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {assets.map((a) => (
              <div key={a.id} className="group relative overflow-hidden rounded-lg border border-line">
                <img src={a.url} alt={a.name} className="aspect-square w-full object-cover" />
                <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Dropdown
                    align="right"
                    trigger={
                      <button className="grid h-7 w-7 place-items-center rounded-md bg-ink/70 text-white backdrop-blur hover:bg-ink">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                    items={[{ label: "Fshij", icon: <Trash2 />, danger: true, onClick: () => deleteAsset(a.id) }]}
                  />
                </div>
                <div className="truncate bg-surface px-2 py-1.5 text-[11px] font-medium text-ink-2">{a.name}</div>
              </div>
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}
