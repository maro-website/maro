"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Misc";
import { BrowserFrame } from "@/components/website-previews/BrowserFrame";
import { PreviewThumb } from "@/components/website-previews/PreviewThumb";
import { PublishModal } from "@/components/editor/PublishModal";
import { useMaro } from "@/context/store";
import { timeAgo } from "@/lib/utils/format";
import { Pencil, Eye, Rocket, Settings, Globe, History, ImageIcon, ArrowLeft } from "lucide-react";

function OverviewInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, getProject } = useMaro();
  const project = getProject(projectId);
  const [publishOpen, setPublishOpen] = React.useState(false);

  if (!ready) return <div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6" /></div>;

  if (!project) {
    return (
      <div>
        <AppHeader />
        <div className="grid place-items-center py-32 text-center">
          <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>Kthehu te dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <button onClick={() => router.push("/dashboard")} className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Të gjitha projektet
        </button>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <BrowserFrame url={project.previewUrl}>
              <PreviewThumb project={project} height={380} />
            </BrowserFrame>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1.5 text-[14px] text-ink-2">{project.tagline ?? project.goal}</p>

            <div className="mt-5 space-y-2.5 rounded-2xl border border-line bg-surface p-4">
              <InfoRow icon={<Globe className="h-4 w-4" />} label="Preview URL" value={project.previewUrl} />
              <InfoRow
                icon={<Globe className="h-4 w-4 text-success" />}
                label="Published URL"
                value={project.publishedUrl ?? "Ende i papublikuar"}
              />
              <InfoRow icon={<History className="h-4 w-4" />} label="Përditësuar" value={timeAgo(project.updatedAt)} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Button icon={<Pencil className="h-4 w-4" />} onClick={() => router.push(`/projects/${projectId}/editor`)}>
                Hape editorin
              </Button>
              <Button variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => window.open(`/projects/${projectId}/preview`, "_blank")}>
                Preview
              </Button>
              <Button variant="outline" icon={<Rocket className="h-4 w-4" />} onClick={() => setPublishOpen(true)}>
                Publiko
              </Button>
              <Button variant="outline" icon={<Settings className="h-4 w-4" />} onClick={() => router.push(`/projects/${projectId}/settings`)}>
                Cilësimet
              </Button>
            </div>
          </div>
        </div>

        {/* Activity + assets */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-[14px] font-bold text-ink">
              <History className="h-4 w-4 text-brand" /> Aktiviteti i fundit
            </div>
            <div className="space-y-3">
              {[...project.versions].reverse().slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center justify-between">
                  <span className="text-[13.5px] text-ink">{v.label}</span>
                  <span className="text-[12px] text-ink-3">{timeAgo(v.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-[14px] font-bold text-ink">
              <ImageIcon className="h-4 w-4 text-brand" /> Asetet e projektit
            </div>
            <div className="grid grid-cols-4 gap-2">
              {project.assets.slice(0, 8).map((a) => (
                <img key={a.id} src={a.url} alt={a.name} className="aspect-square w-full rounded-lg border border-line object-cover" />
              ))}
            </div>
          </div>
        </div>
      </main>

      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} project={project} />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[13px] text-ink-3">{icon} {label}</span>
      <span className="truncate text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}

export default function ProjectOverviewPage() {
  return (
    <AuthGate>
      <OverviewInner />
    </AuthGate>
  );
}
