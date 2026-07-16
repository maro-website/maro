"use client";

import * as React from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { PUBLISH_STEPS, runPublish } from "@/lib/services/publishService";
import { cn } from "@/lib/utils/cn";
import type { Project } from "@/lib/types";
import { Rocket, Globe, Check, Copy, ExternalLink, Loader2 } from "lucide-react";

type Phase = "config" | "publishing" | "done";

export function PublishModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
}) {
  const { updateProject } = useMaro();
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<Phase>("config");
  const [step, setStep] = React.useState(0);
  const [customDomain, setCustomDomain] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setPhase(project.status === "published" ? "done" : "config");
      setStep(0);
    }
  }, [open, project.status]);

  const start = () => {
    setPhase("publishing");
    runPublish(
      (i) => setStep(i),
      () => {
        updateProject(project.id, { status: "published", publishedUrl: project.previewUrl });
        setPhase("done");
      }
    );
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://${project.previewUrl}`);
    toast("Linku u kopjua");
  };

  return (
    <Modal open={open} onClose={phase === "publishing" ? () => {} : onClose} closeOnBackdrop={phase !== "publishing"} hideClose={phase === "publishing"}>
      {phase === "config" && (
        <>
          <ModalHeader icon={<Rocket className="h-5 w-5" />} title="Publiko website-in" description="Zgjidh domainin dhe publiko website-in tënd." />
          <div className="space-y-4 px-6 pb-2">
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-bold text-ink">Maro Domain</span>
                <Badge tone="success"><Check className="h-3 w-3" /> Available</Badge>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
                <Globe className="h-4 w-4 text-brand" />
                <span className="text-[14px] font-semibold text-ink">{project.previewUrl}</span>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[13px] font-bold text-ink">Custom Domain</span>
                <Badge tone="neutral">opsionale</Badge>
              </div>
              <Input placeholder="www.business.com" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} />
              <p className="mt-2 text-[12px] text-ink-3">Konfigurimi i DNS simulohet në Phase 1.</p>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>Anulo</Button>
            <Button icon={<Rocket className="h-4 w-4" />} onClick={start}>Publish</Button>
          </ModalFooter>
        </>
      )}

      {phase === "publishing" && (
        <div className="px-6 py-10">
          <div className="mx-auto max-w-xs">
            {PUBLISH_STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={label} className="flex items-center gap-3 py-2.5">
                  <span className={cn("grid h-7 w-7 place-items-center rounded-full border transition-all", done ? "border-brand bg-brand text-white" : active ? "border-brand text-brand" : "border-line-strong text-ink-3")}>
                    {done ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <span className={cn("text-[14px]", done || active ? "font-semibold text-ink" : "text-ink-3")}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phase === "done" && (
        <>
          <div className="px-6 pb-2 pt-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-[20px] font-bold tracking-tight text-ink">Website-i yt është live.</h2>
            <a
              href={`/projects/${project.id}/preview`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-brand transition-colors hover:bg-surface-2"
            >
              <Globe className="h-4 w-4" /> {project.previewUrl}
            </a>
          </div>
          <ModalFooter>
            <Button variant="outline" icon={<Copy className="h-4 w-4" />} onClick={copyLink}>Copy Link</Button>
            <a href={`/projects/${project.id}/preview`} target="_blank" rel="noreferrer">
              <Button variant="outline" icon={<ExternalLink className="h-4 w-4" />}>Open Website</Button>
            </a>
            <Button onClick={onClose}>Done</Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
