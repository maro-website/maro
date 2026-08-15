"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { fetchPrompts } from "@/lib/services/promptsService";
import { PROMPT_ATTACH_KEY, type PromptItem } from "@/lib/prompts/types";
import { cn } from "@/lib/utils/cn";
import { Megaphone, Sparkles } from "lucide-react";

export const MARKETING_TEMPLATE_CATEGORIES = [
  { id: "all", label: "Të gjitha" },
  { id: "product", label: "Product shot" },
  { id: "ads", label: "Ads" },
  { id: "posters", label: "Posters" },
  { id: "motion", label: "Motion" },
] as const;

/** Marketing Studio — product-to-content templates routing into maro Imazh. */
export default function MarketingStudioPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<PromptItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState<string>("all");

  React.useEffect(() => {
    void fetchPrompts().then((r) => {
      setItems(r.items.filter((p) => p.target_tool === "reklama"));
      setLoading(false);
    });
  }, []);

  const filtered = items.filter((p) => {
    if (category === "all") return true;
    return (p.category ?? "").toLowerCase().includes(category);
  });

  const useTemplate = (item: PromptItem) => {
    sessionStorage.setItem(
      PROMPT_ATTACH_KEY,
      JSON.stringify({ id: item.id, code: item.code, targetTool: "reklama" })
    );
    router.push("/imazh");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-bold text-brand">
            <Megaphone className="h-3.5 w-3.5" />
            Marketing Studio
          </span>
          <h1 className="mt-4 text-[clamp(24px,4vw,36px)] font-bold tracking-brand text-ink">
            Kthe produktin në përmbajtje gati për postim
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-ink-2">
            Zgjidh një template, shto produktin tënd dhe gjenero reklama, postera dhe vizuale sociale me maro Imazh.
          </p>
          <button
            type="button"
            onClick={() => router.push("/imazh")}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-bold text-brand-fg hover:bg-brand-hover"
          >
            <Sparkles className="h-5 w-5" />
            Fillo me maro Imazh
          </button>
        </div>

        <div className="mt-10">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-3">
            Eksploro template
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {MARKETING_TEMPLATE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
                  category === c.id
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink-2 hover:border-ink hover:text-ink"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="mt-8 text-center text-[14px] text-ink-3">Duke ngarkuar…</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => useTemplate(item)}
                  className="group overflow-hidden rounded-maro16 border border-line bg-surface text-left transition-colors hover:border-ink"
                >
                  <div className="aspect-[3/4] bg-canvas">
                    {item.featured_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.featured_url}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[12px] text-ink-3">
                        {item.code}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[13px] font-bold text-ink">{item.code}</p>
                    <p className="truncate text-[12px] text-ink-3">{item.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
