"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmailsWorkspace } from "@/components/admin/emails/EmailsWorkspace";
import { cn } from "@/lib/utils/cn";
import { FileText, LayoutDashboard, ScrollText, Settings } from "lucide-react";

type Tab = "overview" | "templates" | "logs" | "settings";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Përmbledhje", icon: LayoutDashboard },
  { key: "templates", label: "Shabllonet", icon: FileText },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "settings", label: "Cilësimet", icon: Settings },
];

function EmailsPageInner() {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const initialTab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "overview";
  const [tab, setTab] = React.useState<Tab>(initialTab);

  React.useEffect(() => {
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setTab(tabParam as Tab);
    }
  }, [tabParam]);

  return (
    <div>
      <AdminPageHeader
        title="Emailat"
        description="Menaxho shabllonet transaksionale, logs dhe cilësimet e dërgimit."
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

      <EmailsWorkspace tab={tab} />
    </div>
  );
}

export default function AdminEmailsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[13px] text-ink-3">Duke ngarkuar…</div>}>
      <EmailsPageInner />
    </Suspense>
  );
}
