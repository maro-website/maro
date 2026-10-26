import { handleMarketingGet, handleMarketingCreate } from "@/lib/marketing/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const GET = handleMarketingGet;
export const POST = handleMarketingCreate;
