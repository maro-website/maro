import { NextResponse } from "next/server";
import type { AiImageRequest } from "@/lib/ai/imageTypes";
import {
  executeMaroImageApplication,
  type MaroImageApplicationAdapter,
} from "@/lib/maro-imazh/applicationService";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { denyIfProductionWithoutSupabase } from "@/lib/security/protectedRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const infraDeny = denyIfProductionWithoutSupabase();
  if (infraDeny) return infraDeny;

  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!parsed.ok) return parsed.response;

  const adapter: MaroImageApplicationAdapter<Response> = {
    failure(payload, status) {
      return NextResponse.json(payload, { status });
    },
    stream(run) {
      const stream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          const send = (payload: Record<string, unknown>) => {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
          };
          const heartbeat = setInterval(() => {
            controller.enqueue(enc.encode(": ping\n\n"));
          }, 15000);

          try {
            await run(send);
          } finally {
            clearInterval(heartbeat);
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    },
  };

  return executeMaroImageApplication(req, parsed.body as AiImageRequest, adapter);
}
