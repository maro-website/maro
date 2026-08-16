"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export default function PresetCategoriesPage() {
  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [slug, setSlug] = React.useState("");
  const [label, setLabel] = React.useState("");

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/presets/categories", { headers });
    const data = (await res.json()) as { categories?: CategoryRow[] };
    setCategories(data.categories ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createCategory() {
    if (!slug.trim() || !label.trim()) return;
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/presets/categories", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug, label }),
    });
    setSlug("");
    setLabel("");
    await load();
  }

  return (
    <div>
      <AdminPageHeader
        title="maroPresets categories"
        description="Dynamic categories (preset_categories) — prompts editor at /admin/prompts"
        actions={
          <Link href="/admin/prompts" className="text-[13px] font-semibold text-brand hover:underline">
            Presets editor →
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <div>
          <label className="text-[11px] font-semibold text-ink-3">Slug</label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="marketing" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-ink-3">Label</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Marketing" />
        </div>
        <Button onClick={() => void createCategory()}>Add category</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 font-semibold">{c.label}</td>
                <td className="px-3 py-2 text-ink-3">{c.slug}</td>
                <td className="px-3 py-2">{c.sortOrder}</td>
                <td className="px-3 py-2">{c.active ? "Yes" : "No"}</td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-ink-3">
                  No categories — add one or seed via migration.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
