import { handleSocialGet, handleSocialPost } from "@/lib/marketing/socials";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const GET = handleSocialGet;
export const POST = handleSocialPost;
