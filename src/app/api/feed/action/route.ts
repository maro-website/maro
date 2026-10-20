import { handleFeedAction } from "@/lib/feed/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handleFeedAction;
