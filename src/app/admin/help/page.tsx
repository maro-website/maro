"use client";

import * as React from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: string;
  published: boolean;
  archived: boolean;
}

export default function HelpCenterAdminPage() {
  const [articles, setArticles] = React.useState<ArticleRow[]>([]);
  const [slug, setSlug] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [filter, setFilter] = React.useState("");

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/help/articles", { headers });
    const data = (await res.json()) as { articles?: ArticleRow[] };
    setArticles(data.articles ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveDraft() {
    if (!slug.trim() || !title.trim()) return;
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/help/articles", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug, title, body, published: false, archived: false }),
    });
    setSlug("");
    setTitle("");
    setBody("");
    await load();
  }

  async function togglePublish(a: ArticleRow) {
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/help/articles", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: a.id, slug: a.slug, title: a.title, body: a.body, published: !a.published, archived: a.archived }),
    });
    await load();
  }

  async function archiveArticle(a: ArticleRow) {
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/help/articles", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: a.id, slug: a.slug, title: a.title, body: a.body, published: false, archived: true }),
    });
    await load();
  }

  const filtered = articles.filter(
    (a) =>
      !filter.trim() ||
      a.title.toLowerCase().includes(filter.toLowerCase()) ||
      a.slug.includes(filter.toLowerCase())
  );

  return (
    <div>
      <AdminPageHeader title="Help Center" description="Lightweight help article CMS" />

      <div className="mb-4 grid gap-2 rounded-xl border border-line bg-surface p-4 md:grid-cols-2">
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" className="md:col-span-2" />
        <Button onClick={() => void saveDraft()}>Save draft</Button>
      </div>

      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search…" className="mb-3" />

      <div className="space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3">
            <div>
              <div className="font-semibold text-ink">{a.title}</div>
              <div className="text-[12px] text-ink-3">
                /{a.slug} · {a.category} · {a.archived ? "archived" : a.published ? "published" : "draft"}
              </div>
            </div>
            <div className="flex gap-2">
              {!a.archived && (
                <Button size="sm" variant="secondary" onClick={() => void togglePublish(a)}>
                  {a.published ? "Unpublish" : "Publish"}
                </Button>
              )}
              {!a.archived && (
                <Button size="sm" variant="ghost" onClick={() => void archiveArticle(a)}>
                  Archive
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
