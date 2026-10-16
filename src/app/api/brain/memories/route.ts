import { handleStudioMemories } from "@/lib/brain-studio/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleStudioMemories;
export const POST = handleStudioMemories;
