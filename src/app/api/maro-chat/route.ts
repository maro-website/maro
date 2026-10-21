import { handleChatGet, handleChatSend } from "@/lib/maro-chat/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleChatGet;
export const POST = handleChatSend;
