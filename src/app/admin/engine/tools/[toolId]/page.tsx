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
  return <EngineToolWorkspace toolId={toolId} />;
}
