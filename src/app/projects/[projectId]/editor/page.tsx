"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { EditorProvider } from "@/context/editor";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { ChatPanel } from "@/components/editor/ChatPanel";
import { DeviceCanvas } from "@/components/editor/DeviceCanvas";
import { RightSidebar } from "@/components/editor/RightSidebar";
import { PublishModal } from "@/components/editor/PublishModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Misc";
import { useMaro } from "@/context/store";
import { Sparkles, PanelLeftOpen, Monitor } from "lucide-react";

function EditorInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, getProject } = useMaro();
  const project = getProject(projectId);
  const [chatOpen, setChatOpen] = React.useState(true);
  const [publishOpen, setPublishOpen] = React.useState(false);

  React.useEffect(() => {
    if (ready && project && project.status === "generating") {
      router.replace(`/projects/${projectId}/generating`);
    }
  }, [ready, project, projectId, router]);

  if (!ready) {
    return <div className="grid h-screen place-items-center"><Spinner className="h-6 w-6" /></div>;
  }

  if (!project) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="text-center">
          <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
          <p className="mt-1 text-[14px] text-ink-2">Ndoshta u fshi ose linku është i pasaktë.</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>Kthehu te dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <EditorProvider project={project}>
      {/* Desktop editor */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        <EditorTopBar
          onPublish={() => setPublishOpen(true)}
          onPreview={() => window.open(`/projects/${projectId}/preview`, "_blank")}
        />
        <div className="flex min-h-0 flex-1">
          {chatOpen ? (
            <div className="w-[300px] shrink-0 border-r border-line">
              <ChatPanel onCollapse={() => setChatOpen(false)} />
            </div>
          ) : (
            <button
              onClick={() => setChatOpen(true)}
              className="flex w-11 shrink-0 flex-col items-center gap-2 border-r border-line bg-canvas py-3 text-ink-3 transition-colors hover:text-brand"
            >
              <PanelLeftOpen className="h-4 w-4" />
              <Sparkles className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <DeviceCanvas />
          </div>

          <div className="w-[340px] shrink-0 border-l border-line">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Mobile fallback */}
      <div className="grid h-screen place-items-center px-6 lg:hidden">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Monitor className="h-6 w-6" />
          </div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink">Hape Maro në desktop</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Për eksperiencën më të mirë të editimit, hape Maro në desktop. Nga telefoni mund të
            shohësh dashboard-in dhe llogarinë.
          </p>
          <Button className="mt-5" onClick={() => router.push("/dashboard")}>Kthehu te dashboard</Button>
        </div>
      </div>

      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} project={project} />
    </EditorProvider>
  );
}

export default function EditorPage() {
  return (
    <AuthGate>
      <EditorInner />
    </AuthGate>
  );
}
