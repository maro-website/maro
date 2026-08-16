"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { cn } from "@/lib/utils/cn";
import { BarChart3, LayoutGrid, List, Plus } from "lucide-react";
import { MaroPresetsWorkspace } from "@/components/admin/presets/MaroPresetsWorkspace";

type Tab = "stats" | "add" | "list" | "categories";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "stats", label: "Përmbledhje", icon: BarChart3 },
  { key: "list", label: "Presetet", icon: List },
  { key: "add", label: "Shto preset", icon: Plus },
  { key: "categories", label: "Kategoritë", icon: LayoutGrid },
];

function MaroPresetsPageInner() {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const initialTab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "stats";
  const [tab, setTab] = React.useState<Tab>(initialTab);

  React.useEffect(() => {
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setTab(tabParam as Tab);
    }
  }, [tabParam]);

  return (
    <div>
      <AdminPageHeader
        title="maroPresets"
        description="Kurato preset-et e produktit, kategoritë dhe statistikat e përdorimit."
      />

      <nav className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
              tab === t.key ? "bg-ink text-ink-inv" : "text-ink-2 hover:bg-surface-2"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </nav>

      <MaroPresetsWorkspace tab={tab} onTabChange={setTab} />
    </div>
  );
}

export default function MaroPresetsAdminPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[13px] text-ink-3">Duke ngarkuar…</div>}>
      <MaroPresetsPageInner />
    </Suspense>
  );
}
