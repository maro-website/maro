import { executeV1ImageApplication } from "@/lib/generation/v1ImageApplication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const POST = executeV1ImageApplication;
