import { handleBrandFetch } from "@/lib/brain-fetch/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) { return handleBrandFetch(req, "logo"); }
