import { denyUnavailableGeneration } from "@/lib/generation/availability";
import { resolveProductModule } from "@/lib/modules/availability";
import { loadV1ImageModelRows, publicV1ImageModel, validateV1ModelSet } from "@/lib/engine/v1ImageModels";
import { ImageRequestValidationError, v1ImageValidationResponse } from "@/lib/generation/v1ImageRequest";

export const dynamic = "force-dynamic";

/** Public product fields only. Generation still resolves a fresh authoritative snapshot. */
export async function GET(req: Request) {
  const toolId = new URL(req.url).searchParams.get("toolId");
  const unavailable = denyUnavailableGeneration(toolId);
  if (unavailable) return unavailable;
  const productModule = resolveProductModule(toolId) === "logo" ? "maro_logo" : "maro_imazh";
  try {
    const rows = await loadV1ImageModelRows(productModule);
    const models = validateV1ModelSet(rows, productModule).filter((m) => m.enabled);
    return Response.json({ models: models.sort((a, b) => a.order - b.order).map(publicV1ImageModel) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return v1ImageValidationResponse(error);
  }
}
