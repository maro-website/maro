import { V1ToolWorkspace } from "@/components/admin/v1/V1ToolWorkspace";
import { EngineToolWorkspace } from "@/components/admin/engine/EngineToolWorkspace";
import { isEngineToolId } from "@/lib/engine/toolRegistry";
import { notFound } from "next/navigation";

export default async function AdminEngineToolPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  if (!isEngineToolId(toolId)) notFound();
  if (toolId === "maro_imazh" || toolId === "maro_logo") return <V1ToolWorkspace toolId={toolId} />;
  return <div><p className="m-6 rounded-xl border border-line bg-surface p-4 text-ink-3">Developer / future configuration. V1 release policy keeps this module parked.</p><EngineToolWorkspace toolId={toolId} /></div>;
}
