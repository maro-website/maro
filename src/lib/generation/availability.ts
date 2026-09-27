import "server-only";
import { generationAvailabilityError } from "@/lib/modules/availability";

/** Reject before parsing fixed-module requests, loading secrets, reserving or calling providers. */
export function denyUnavailableGeneration(module: unknown): Response | null {
  const denial = generationAvailabilityError(module);
  if (!denial) return null;
  const { status, ...body } = denial;
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
