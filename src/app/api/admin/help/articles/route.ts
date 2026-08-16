import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { listHelpArticles, upsertHelpArticle } from "@/lib/help/articles";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "help.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const articles = await listHelpArticles(true);
  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "help.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    id?: string;
    slug?: string;
    title?: string;
    body?: string;
    category?: string;
    published?: boolean;
    archived?: boolean;
    sortOrder?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.slug?.trim() || !body.title?.trim()) {
    return NextResponse.json({ error: "slug_and_title_required" }, { status: 400 });
  }

  const article = await upsertHelpArticle({
    id: body.id,
    slug: body.slug,
    title: body.title,
    body: body.body,
    category: body.category,
    published: body.published,
    archived: body.archived,
    sortOrder: body.sortOrder,
  });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: body.id ? "help.article.update" : "help.article.create",
    targetType: "help_articles",
    targetId: article.id as string,
    requestId: auth.requestId,
  });

  return NextResponse.json({ article });
}
