"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import type { Project } from "@/lib/types";
import { Plus, Sparkles, Trash2 } from "lucide-react";

function DashboardInner() {
  const router = useRouter();
  const { ready, projects, deleteProject, duplicateProject, renameProject } = useMaro();
  const { toast } = useToast();

  const [renaming, setRenaming] = React.useState<Project | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [deleting, setDeleting] = React.useState<Project | null>(null);

  const startRename = (p: Project) => {
    setRenaming(p);
    setRenameValue(p.name);
  };

  const confirmRename = () => {
    if (renaming) {
      renameProject(renaming.id, renameValue.trim() || renaming.name);
      toast("Projekti u riemërtua");
    }
    setRenaming(null);
  };

  const confirmDelete = () => {
    if (deleting) {
      deleteProject(deleting.id);
      toast("Projekti u fshi");
    }
    setDeleting(null);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink">Websitet e tua</h1>
            <p className="mt-1.5 text-[14.5px] text-ink-2">
              Menaxho, redakto dhe publiko website-t e tua të maruara me AI.
            </p>
          </div>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => router.push("/new")}>
            Maro një website
          </Button>
        </div>

        <div className="mt-8">
          {!ready ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  <Skeleton className="h-[188px] rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              className="py-20"
              icon={<Sparkles />}
              title="Ende nuk ke maru asnjë website."
              description="Trego çka po ndërton dhe Maro ta kthen në website."
              action={
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => router.push("/new")}>
                  Maro website-in e parë
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onRename={() => startRename(p)}
                  onDuplicate={() => {
                    duplicateProject(p.id);
                    toast("Projekti u dyfishua");
                  }}
                  onDelete={() => setDeleting(p)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Rename modal */}
      <Modal open={!!renaming} onClose={() => setRenaming(null)} size="sm">
        <ModalHeader title="Riemërto projektin" description="Zgjidh një emër të ri për projektin." />
        <div className="px-6 pb-2">
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmRename()}
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setRenaming(null)}>Anulo</Button>
          <Button onClick={confirmRename}>Ruaj</Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} size="sm">
        <ModalHeader
          icon={<Trash2 className="h-5 w-5 text-danger" />}
          title="Fshij projektin?"
          description={`"${deleting?.name}" do të fshihet përgjithmonë. Ky veprim nuk mund të kthehet.`}
        />
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleting(null)}>Anulo</Button>
          <Button variant="danger" onClick={confirmDelete}>Fshij projektin</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}
