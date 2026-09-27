import { loadLogoContent } from "@/lib/marologo/contentServer";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ content: await loadLogoContent() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "logo_content_unavailable" }, { status: 503 }); }
}
