import { handleMarketingAction } from "@/lib/marketing/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handleMarketingAction;
