import { handleFeedCreate, handleFeedGet } from "@/lib/feed/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleFeedGet;
export const POST = handleFeedCreate;
