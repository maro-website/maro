import { requirePermission } from "@/lib/admin/auth";
import { loadV1ImageModelRows, validateV1ModelSet, publicV1ImageModel } from "@/lib/engine/v1ImageModels";
import { loadProductionImagePrompt } from "@/lib/generation/v1ImagePrompt";
import { loadLogoContent } from "@/lib/marologo/contentServer";
import { isV1ProductionLayer, validateLayerEdit } from "@/lib/admin/v1Configuration";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requirePermission(req, "engine.view"); if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const modules = await Promise.all((["maro_imazh", "maro_logo"] as const).map(async (module) => {
    try {
      const [rows, prompt] = await Promise.all([loadV1ImageModelRows(module), loadProductionImagePrompt(module)]);
      for (const layer of prompt.layers.filter(isV1ProductionLayer)) validateLayerEdit({ id: layer.id, instructions: layer.instructions }, layer);
      if (module === "maro_logo") await loadLogoContent();
      return { module, configured: true, models: validateV1ModelSet(rows, module).map(publicV1ImageModel), system: { id: prompt.system.id, version: prompt.system.version_label }, layers: prompt.layers.filter(isV1ProductionLayer).length };
    } catch { return { module, configured: false, models: [], system: null, layers: 0 }; }
  }));
  return Response.json({ modules }, { headers: { "Cache-Control": "no-store" } });
}
